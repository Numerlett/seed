import { Prisma } from '@seed/database';
import { TRPCError } from '@trpc/server';
import type { EInvoicePayload } from '@seed/integrations';

/**
 * Builds the IRP (NIC) e-invoice payload from a confirmed sale invoice.
 *
 * The figures come from the columns frozen at confirmation, never from a fresh
 * tax computation. What is filed with the portal has to be identical to what
 * was printed and what GSTR-1 reports; recomputing here would let a later
 * change to a product's tax rate silently file a different invoice.
 *
 * Money crosses into JSON here, which is the API boundary — this is the one
 * place converting Decimal to number is correct.
 */

/** Prisma Decimal → number, at the API boundary only. */
function num(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : value.toNumber();
}

/** IRP wants dd/mm/yyyy. */
function irpDate(date: Date): string {
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${date.getUTCFullYear()}`;
}

/** IRP rejects a non-numeric PIN; 999999 is the documented placeholder for exports. */
function pin(postalCode: string | null | undefined, fallback = 999999): number {
  const digits = (postalCode ?? '').replace(/\D/g, '');
  return digits.length === 6 ? Number(digits) : fallback;
}

type InvoiceForEInvoice = Prisma.SaleInvoiceGetPayload<{
  include: {
    items: { include: { product: true } };
    customer: { include: { addresses: true } };
    business: { include: { gstRegistration: true } };
  };
}>;

/**
 * Fields the IRP requires that SEED allows to be blank locally. Collected and
 * reported together so the user fixes them in one pass instead of discovering
 * them one portal rejection at a time.
 */
function collectMissing(invoice: InvoiceForEInvoice): string[] {
  const missing: string[] = [];
  const reg = invoice.business.gstRegistration;
  const biz = invoice.business;

  if (!reg) missing.push('the business GST registration (Tax → Settings)');
  if (!reg?.gstin) missing.push('seller GSTIN');
  if (!reg?.legalName) missing.push('seller legal name');
  if (!biz.addressLine1) missing.push('business address line 1');
  if (!biz.city) missing.push('business city');
  if (!biz.postalCode) missing.push('business postal code');
  if (!reg?.stateCode) missing.push('seller state code');

  const isB2B = (invoice.supplyType ?? 'B2C') === 'B2B';
  if (isB2B && !invoice.customer.gstin) missing.push('customer GSTIN');

  const address = invoice.customer.addresses[0];
  if (!address) missing.push('a customer address');

  if (invoice.items.length === 0) missing.push('at least one line item');
  const missingHsn = invoice.items.filter((item) => !item.hsnCode);
  if (missingHsn.length > 0) {
    missing.push(
      `HSN code on ${missingHsn.length} line item(s): ` +
        missingHsn.map((item) => item.product.name).join(', '),
    );
  }

  return missing;
}

export function buildEInvoicePayload(
  invoice: InvoiceForEInvoice,
  docType: 'INV' | 'CRN' | 'DBN' = 'INV',
): EInvoicePayload {
  const missing = collectMissing(invoice);
  if (missing.length > 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message:
        'This invoice cannot be registered with the IRP until the following ' +
        `is filled in: ${missing.join('; ')}.`,
    });
  }

  const reg = invoice.business.gstRegistration!;
  const biz = invoice.business;
  const customer = invoice.customer;
  const address = customer.addresses[0]!;

  // E-invoicing applies to B2B, SEZ and export supplies. A B2C sale has no IRN
  // to generate, so registering one would be rejected by the portal — say so
  // here rather than letting it fail as an opaque IRP error code.
  const supplyType = invoice.supplyType ?? 'B2C';
  if (!invoice.isExport && !invoice.isSEZ && supplyType !== 'B2B') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message:
        'E-invoicing applies to B2B, SEZ and export supplies only. ' +
        `This invoice is ${supplyType}.`,
    });
  }

  // SEZ supplies are declared by whether tax was charged; exports by LUT status.
  const supTyp = invoice.isExport
    ? invoice.igstAmount.isZero()
      ? 'EXPWOP'
      : 'EXPWP'
    : invoice.isSEZ
      ? invoice.igstAmount.isZero()
        ? 'SEZWOP'
        : 'SEZWP'
      : 'B2B';

  // Place of supply drives the CGST/SGST vs IGST split the portal validates
  // against, so it must be the code the invoice was actually taxed on.
  const placeOfSupply =
    invoice.placeOfSupply ??
    customer.stateCode ??
    (customer.gstin ? customer.gstin.slice(0, 2) : reg.stateCode);

  return {
    Version: '1.1',
    TranDtls: {
      TaxSch: 'GST',
      SupTyp: supTyp,
      RegRev: 'N',
    },
    DocDtls: {
      Typ: docType,
      No: invoice.documentNumber,
      Dt: irpDate(invoice.invoiceDate),
    },
    SellerDtls: {
      Gstin: reg.gstin,
      LglNm: reg.legalName,
      TrdNm: reg.tradeName || undefined,
      Addr1: biz.addressLine1!,
      Addr2: biz.addressLine2 || undefined,
      Loc: biz.city!,
      Pin: pin(biz.postalCode),
      Stcd: reg.stateCode,
      Ph: biz.phone || undefined,
      Em: biz.email || undefined,
    },
    BuyerDtls: {
      // URP ("unregistered person") is the portal's required literal for B2C.
      Gstin: customer.gstin || 'URP',
      LglNm: customer.name,
      Pos: placeOfSupply,
      Addr1: address.line1,
      Addr2: address.line2 || undefined,
      Loc: address.city,
      Pin: pin(address.postalCode),
      Stcd: customer.stateCode ?? placeOfSupply,
      Ph: customer.phone || undefined,
      Em: customer.email || undefined,
    },
    ItemList: invoice.items.map((item, index) => {
      const taxable = num(item.taxableAmount);
      const gross = num(item.quantity) * num(item.unitPrice);
      return {
        SlNo: String(index + 1),
        PrdDesc: item.product.name,
        IsServc: 'N',
        HsnCd: item.hsnCode!,
        Qty: num(item.quantity),
        UnitPrice: num(item.unitPrice),
        TotAmt: gross,
        Discount: num(item.discount) > 0 ? gross - taxable : undefined,
        AssAmt: taxable,
        GstRt: num(item.taxRate),
        IgstAmt: num(item.igstAmount),
        CgstAmt: num(item.cgstAmount),
        SgstAmt: num(item.sgstAmount),
        CesRt: num(item.cessRate) || undefined,
        CesAmt: num(item.cessAmount) || undefined,
        TotItemVal: num(item.totalPrice),
      };
    }),
    ValDtls: {
      AssVal: num(invoice.taxableAmount),
      CgstVal: num(invoice.cgstAmount),
      SgstVal: num(invoice.sgstAmount),
      IgstVal: num(invoice.igstAmount),
      CesVal: num(invoice.cessAmount),
      Discount: num(invoice.discountAmount) || undefined,
      RndOffAmt: num(invoice.roundOff) || undefined,
      TotInvVal: num(invoice.grandTotal) + num(invoice.roundOff),
    },
  };
}

export const einvoiceInclude = {
  items: { include: { product: true } },
  customer: { include: { addresses: true } },
  business: { include: { gstRegistration: true } },
} satisfies Prisma.SaleInvoiceInclude;

/** Exported for tests. */
export const __testing = { irpDate, pin, num };
