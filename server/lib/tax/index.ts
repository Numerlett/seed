import { Prisma, prisma } from '@seed/database';
import { computeInvoice, type TaxInvoiceResult } from '@seed/tax';

/**
 * Accepts either the base client or a transaction client, so tax can be
 * computed inside the same transaction that persists it.
 */
export type DbClient = typeof prisma | Prisma.TransactionClient;

/** A money-ish value as it arrives from Prisma or from a Zod-parsed input. */
type Amount = Prisma.Decimal | number | null | undefined;

/**
 * Line shape shared by sale invoices and purchase documents. `taxRate`,
 * `discount` and `cessRate` are percentages (0–100), matching the input
 * schemas — the tax engine wants an absolute discount, which this module
 * converts.
 */
export type TaxableLine = {
  productId: string;
  quantity: Amount;
  unitPrice: Amount;
  taxRate?: Amount;
  discount?: Amount;
  cessRate?: Amount;
  hsnCode?: string | null;
};

export type ComputeTaxArgs = {
  businessId: string;
  /** Customer for a sale, supplier for a purchase. */
  partyId: string;
  lines: TaxableLine[];
  isExport?: boolean;
  isSEZ?: boolean;
  withPaymentOfTax?: boolean;
};

/** Prisma Decimals stringify losslessly; numbers do not, so never use Number(). */
function str(value: Amount): string {
  if (value === null || value === undefined) return '0';
  return value.toString();
}

/**
 * The supplier's state code from their GST registration, or null when the
 * business has not registered for GST.
 */
export async function resolveSellerStateCode(
  businessId: string,
  db: DbClient = prisma,
): Promise<string | null> {
  const profile = await db.gSTRegistration.findUnique({
    where: { businessId },
    select: { stateCode: true },
  });
  return profile?.stateCode ?? null;
}

/**
 * Computes the GST breakup for a document's lines.
 *
 * Resolves both sides of the transaction from the database rather than trusting
 * the caller: the seller's state comes from the business's GST registration and
 * the buyer's from the party record, falling back to the state embedded in
 * their GSTIN.
 *
 * When the business has no GST registration it is not charging IGST, so the
 * seller state falls back to the buyer's and the supply resolves as
 * intra-state. That is deliberately conservative — the previous behaviour
 * defaulted to Maharashtra, which silently produced the wrong split for every
 * business registered elsewhere.
 */
export async function computeDocumentTax(
  db: DbClient,
  args: ComputeTaxArgs,
): Promise<TaxInvoiceResult> {
  const [sellerStateCode, party] = await Promise.all([
    resolveSellerStateCode(args.businessId, db),
    db.party.findUnique({
      where: { id: args.partyId },
      select: { stateCode: true, gstin: true },
    }),
  ]);

  const buyerGstin = party?.gstin ?? null;
  const buyerStateCode =
    party?.stateCode ??
    (buyerGstin && buyerGstin.length >= 2 ? buyerGstin.slice(0, 2) : null);

  return computeInvoice({
    lines: args.lines.map((line) => {
      const quantity = str(line.quantity);
      const unitPrice = str(line.unitPrice);
      const discountPercent = str(line.discount);

      // The schemas carry discount as a percentage; the engine takes an
      // absolute amount. Converting here keeps that mismatch in one place.
      const discountAmount = new Prisma.Decimal(quantity)
        .times(unitPrice)
        .times(discountPercent)
        .div(100)
        .toString();

      return {
        productId: line.productId,
        hsnCode: line.hsnCode ?? undefined,
        quantity,
        unitPrice,
        discountAmount,
        taxRatePercent: str(line.taxRate),
        cessRatePercent: str(line.cessRate),
      };
    }),
    sellerStateCode: sellerStateCode ?? buyerStateCode ?? '',
    buyerStateCode,
    buyerGstin,
    isExport: args.isExport,
    isSEZ: args.isSEZ,
    withPaymentOfTax: args.withPaymentOfTax,
  });
}

/**
 * Computes the GST breakup for a purchase document, resolving HSN codes from
 * the products involved.
 *
 * The supplier is the seller here and the business is the buyer — the reverse
 * of a sale. That does not change the arithmetic: whether IGST or CGST+SGST
 * applies depends only on whether the two state codes differ, which is
 * symmetric. `supplyType` reads as B2B when the supplier is GST-registered,
 * which is what makes the input tax credit on the purchase claimable.
 */
export async function computePurchaseTax(
  db: DbClient,
  businessId: string,
  input: {
    supplierId: string;
    items: Array<{
      productId: string;
      quantity: Amount;
      unitPrice: Amount;
      taxRate?: Amount;
      discount?: Amount;
      cessRate?: Amount;
    }>;
  },
): Promise<TaxInvoiceResult> {
  const productIds = [...new Set(input.items.map((i) => i.productId))];
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, hsnCode: true },
  });
  const hsnByProduct = new Map(products.map((p) => [p.id, p.hsnCode]));

  return computeDocumentTax(db, {
    businessId,
    partyId: input.supplierId,
    lines: input.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
      discount: item.discount,
      cessRate: item.cessRate,
      hsnCode: hsnByProduct.get(item.productId),
    })),
  });
}

/**
 * Document-level columns to persist from a computed result.
 *
 * `grandTotal` stays unrounded so payment allocation and outstanding balances
 * keep their current meaning; `roundOff` is recorded alongside it for the
 * printed invoice.
 */
export function documentTaxColumns(result: TaxInvoiceResult) {
  return {
    totalAmount: result.subtotal.toFixed(2),
    discountAmount: result.totalDiscount.toFixed(2),
    taxableAmount: result.totalTaxable.toFixed(2),
    cgstAmount: result.totalCgst.toFixed(2),
    sgstAmount: result.totalSgst.toFixed(2),
    igstAmount: result.totalIgst.toFixed(2),
    cessAmount: result.totalCess.toFixed(2),
    taxAmount: result.totalTax.toFixed(2),
    grandTotal: result.grandTotal.toFixed(2),
    roundOff: result.roundOff.toFixed(2),
    supplyType: result.supplyType,
  };
}

/**
 * Per-line columns to persist, positionally aligned with the lines passed in.
 */
export function lineTaxColumns(result: TaxInvoiceResult) {
  return result.lines.map((line) => ({
    taxableAmount: line.taxableAmount.toFixed(2),
    cgstRate: line.cgstRate.toString(),
    cgstAmount: line.cgstAmount.toFixed(2),
    sgstRate: line.sgstRate.toString(),
    sgstAmount: line.sgstAmount.toFixed(2),
    igstRate: line.igstRate.toString(),
    igstAmount: line.igstAmount.toFixed(2),
    cessAmount: line.cessAmount.toFixed(2),
    totalPrice: line.lineTotal.toFixed(2),
    hsnCode: line.hsnCode ?? null,
  }));
}
