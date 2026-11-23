import { prisma, Prisma } from '@seed/database';
import { TRPCError } from '@trpc/server';
import { money, sumBy, toMoneyNumber } from '@seed/accounting';
import {
  computeInvoice,
  toPlainNumbers,
  validateGstin,
  stateCodeFromGstin,
} from '@seed/tax';
import { resolveSellerStateCode } from '../../../lib/tax';
import {
  buildEInvoicePayload,
  einvoiceInclude,
} from '../../../lib/einvoice/payload';
import {
  cancelEInvoice,
  generateEInvoice,
  generateEWayBill,
} from '../../../lib/dispatch';
import { IntegrationNotConfiguredError } from '../../../lib/dispatch/errors';
import { logger } from '../../../helpers/logger';
import { describeGspError, parseIrpDate } from '../../../lib/einvoice/irp';

// Built-in GST tax rates for India
const STANDARD_TAX_RATES = [
  { id: '0', label: 'Exempt (0%)', percent: 0 },
  { id: '0.25', label: '0.25%', percent: 0.25 },
  { id: '3', label: '3%', percent: 3 },
  { id: '5', label: '5%', percent: 5 },
  { id: '12', label: '12%', percent: 12 },
  { id: '18', label: '18%', percent: 18 },
  { id: '28', label: '28%', percent: 28 },
];

export async function getGstProfile(businessId: string) {
  return prisma.gSTRegistration.findUnique({ where: { businessId } });
}

export async function upsertGstProfile(
  businessId: string,
  input: {
    gstin: string;
    tradeName: string;
    legalName: string;
    registrationType: 'REGULAR' | 'COMPOSITION' | 'UNREGISTERED';
    placeOfBusiness?: string;
    pan?: string;
  },
) {
  if (!validateGstin(input.gstin)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid GSTIN format' });
  }

  const stateCode = stateCodeFromGstin(input.gstin);
  const { ...rest } = input;

  return prisma.gSTRegistration.upsert({
    where: { businessId },
    create: { businessId, ...rest, stateCode },
    update: { ...rest, stateCode },
  });
}

export async function searchHsn(query: string) {
  return prisma.hSNCode.findMany({
    where: {
      OR: [
        { code: { startsWith: query } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: 20,
    orderBy: { code: 'asc' },
  });
}

export async function getTaxRates() {
  return STANDARD_TAX_RATES;
}

export async function computeTaxForLines(
  businessId: string,
  input: {
    lines: Array<{
      quantity: number;
      unitPrice: number;
      discountAmount?: number;
      taxRatePercent: number;
      cessRatePercent?: number;
      hsnCode?: string;
    }>;
    buyerStateCode?: string;
    buyerGstin?: string;
    isExport?: boolean;
    isSEZ?: boolean;
    withPaymentOfTax?: boolean;
  },
) {
  // With no GST registration on file the business is not charging IGST, so the
  // supply resolves as intra-state rather than defaulting to a hardcoded state.
  const sellerStateCode =
    (await resolveSellerStateCode(businessId)) ?? input.buyerStateCode ?? '';

  // Converted to plain numbers at the API boundary; the Decimal values are for
  // persistence, not transport.
  return toPlainNumbers(
    computeInvoice({
      lines: input.lines,
      sellerStateCode,
      buyerStateCode: input.buyerStateCode,
      buyerGstin: input.buyerGstin,
      isExport: input.isExport,
      isSEZ: input.isSEZ,
      withPaymentOfTax: input.withPaymentOfTax,
    }),
  );
}

/**
 * Registers a confirmed invoice with the IRP and stores the IRN it returns.
 *
 * Previously this wrote a PENDING row and returned without contacting the
 * portal, so the UI reported success for an invoice that was never filed and
 * nothing could ever move it out of PENDING. The call is now real: the row
 * reaches GENERATED only when the IRP has issued an IRN, and FAILED (with the
 * portal's own message) when it has not.
 */
export async function generateIrn(businessId: string, invoiceId: string) {
  const invoice = await prisma.saleInvoice.findFirst({
    where: { id: invoiceId, businessId },
    include: einvoiceInclude,
  });

  if (!invoice) throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });

  // A draft can still change; an IRN cannot. Only a frozen invoice may be filed.
  if (invoice.status !== 'CONFIRMED') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Only a confirmed invoice can be registered with the IRP. This one is ${invoice.status}.`,
    });
  }

  const existing = await prisma.eInvoice.findUnique({ where: { invoiceId } });
  if (existing?.status === 'GENERATED') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'IRN already generated for this invoice' });
  }
  if (existing?.status === 'CANCELLED') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message:
        'The IRN for this invoice was cancelled. Issue a credit note instead of re-registering it.',
    });
  }

  // Built before the row is touched: a payload that fails validation must not
  // leave a PENDING record behind.
  const payload = buildEInvoicePayload(invoice);

  try {
    const response = await generateEInvoice(payload);

    // Long-running mode queues the call and returns null; the worker persists
    // the IRN. Record the in-flight attempt so the UI can show it as pending.
    if (!response) {
      return prisma.eInvoice.upsert({
        where: { invoiceId },
        create: { invoiceId, businessId, status: 'PENDING' },
        update: { status: 'PENDING', failureReason: null },
      });
    }

    const data = {
      status: 'GENERATED' as const,
      irn: response.Irn,
      // The portal sends the acknowledgement number as a JSON number; the
      // column is text. Without the coercion a filing that actually succeeded
      // failed while being written, leaving the invoice registered with the
      // IRP and no IRN recorded here.
      ackNo: response.AckNo === null || response.AckNo === undefined
        ? null
        : String(response.AckNo),
      ackDate: parseIrpDate(response.AckDt),
      signedInvoice: response.SignedInvoice,
      signedQRCode: response.SignedQRCode,
      failureReason: null,
    };

    return await prisma.eInvoice.upsert({
      where: { invoiceId },
      create: { invoiceId, businessId, ...data },
      update: data,
    });
  } catch (error) {
    // A missing GSP configuration is not a filing failure — it never reached
    // the portal. Let it through untouched so it surfaces as "not configured"
    // and no misleading FAILED row is written.
    if (error instanceof IntegrationNotConfiguredError || error instanceof TRPCError) {
      throw error;
    }

    const reason = describeGspError(error);
    await prisma.eInvoice.upsert({
      where: { invoiceId },
      create: { invoiceId, businessId, status: 'FAILED', failureReason: reason },
      update: { status: 'FAILED', failureReason: reason },
    });

    logger.error({ err: error, invoiceId, businessId }, 'IRN generation failed');
    throw new TRPCError({
      code: 'BAD_GATEWAY',
      message: `The IRP rejected this invoice: ${reason}`,
      cause: error,
    });
  }
}

export async function cancelIrn(
  businessId: string,
  invoiceId: string,
  reason: string,
  remarks: string,
) {
  const einvoice = await prisma.eInvoice.findFirst({
    where: { invoiceId, businessId },
  });
  if (!einvoice || einvoice.status !== 'GENERATED' || !einvoice.irn) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'No active IRN to cancel' });
  }

  // The IRP only accepts a cancellation within 24 hours of registration.
  // Checking here turns a portal rejection into an explanation.
  const ackDate = einvoice.ackDate ?? einvoice.createdAt;
  if (Date.now() - ackDate.getTime() > 24 * 60 * 60 * 1000) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message:
        'An IRN can only be cancelled within 24 hours of generation. ' +
        'Issue a credit note to reverse this invoice instead.',
    });
  }

  try {
    await cancelEInvoice({
      irn: einvoice.irn,
      reason: Number(reason) as 1 | 2 | 3 | 4 | 5,
      remarks,
    });
  } catch (error) {
    if (error instanceof IntegrationNotConfiguredError || error instanceof TRPCError) {
      throw error;
    }
    const message = describeGspError(error);
    logger.error({ err: error, invoiceId, businessId }, 'IRN cancellation failed');
    throw new TRPCError({
      code: 'BAD_GATEWAY',
      message: `The IRP refused the cancellation: ${message}`,
      cause: error,
    });
  }

  return prisma.eInvoice.update({
    where: { invoiceId },
    data: { status: 'CANCELLED', cancelReason: remarks, cancelledAt: new Date() },
  });
}

export async function getEInvoices(
  businessId: string,
  input: { page: number; limit: number; status?: string },
) {
  const skip = (input.page - 1) * input.limit;
  const statusFilter = input.status as import('@seed/database').EInvoiceStatus | undefined;
  const where = { businessId, ...(statusFilter ? { status: statusFilter } : {}) };

  const [items, total] = await Promise.all([
    prisma.eInvoice.findMany({
      where,
      skip,
      take: input.limit,
      orderBy: { createdAt: 'desc' },
      include: { invoice: { select: { documentNumber: true, invoiceDate: true, grandTotal: true } } },
    }),
    prisma.eInvoice.count({ where }),
  ]);

  return { items, total, page: input.page, limit: input.limit };
}

/**
 * Raises an e-way bill against an invoice that already carries an IRN.
 *
 * Like IRN generation, this used to write a PENDING row without calling the
 * portal. It now files for real and stores the EWB number and validity the
 * portal returns.
 */
export async function generateEwayBill(
  businessId: string,
  input: {
    invoiceId: string;
    transporterId?: string;
    vehicleNo?: string;
    distance: number;
    transportMode: string;
    vehicleType: string;
  },
) {
  const einvoice = await prisma.eInvoice.findFirst({
    where: { invoiceId: input.invoiceId, businessId },
  });
  if (!einvoice || !einvoice.irn || einvoice.status !== 'GENERATED') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Generate IRN first before creating e-way bill',
    });
  }

  const { invoiceId, ...rest } = input;

  try {
    const response = await generateEWayBill({
      Irn: einvoice.irn,
      Distance: input.distance,
      TransMode: input.transportMode as '1' | '2' | '3' | '4',
      TransId: input.transporterId,
      VehNo: input.vehicleNo,
      VehType: input.vehicleType as 'R' | 'O',
    });

    if (!response) {
      return prisma.eWayBill.upsert({
        where: { invoiceId },
        create: { invoiceId, businessId, status: 'PENDING', ...rest },
        update: { status: 'PENDING', failureReason: null, ...rest },
      });
    }

    const data = {
      status: 'GENERATED' as const,
      ewbNo: String(response.EwbNo),
      ewbDate: parseIrpDate(response.EwbDt),
      validUpto: parseIrpDate(response.EwbValidTill),
      failureReason: null,
      ...rest,
    };

    return await prisma.eWayBill.upsert({
      where: { invoiceId },
      create: { invoiceId, businessId, ...data },
      update: data,
    });
  } catch (error) {
    if (error instanceof IntegrationNotConfiguredError || error instanceof TRPCError) {
      throw error;
    }

    const reason = describeGspError(error);
    await prisma.eWayBill.upsert({
      where: { invoiceId },
      create: { invoiceId, businessId, status: 'PENDING', failureReason: reason, ...rest },
      update: { status: 'PENDING', failureReason: reason, ...rest },
    });

    logger.error({ err: error, invoiceId, businessId }, 'E-way bill generation failed');
    throw new TRPCError({
      code: 'BAD_GATEWAY',
      message: `The portal rejected this e-way bill: ${reason}`,
      cause: error,
    });
  }
}

export async function getEWayBills(
  businessId: string,
  input: { page: number; limit: number },
) {
  const skip = (input.page - 1) * input.limit;
  const where = { businessId };

  const [items, total] = await Promise.all([
    prisma.eWayBill.findMany({
      where,
      skip,
      take: input.limit,
      orderBy: { createdAt: 'desc' },
      include: { invoice: { select: { documentNumber: true, invoiceDate: true } } },
    }),
    prisma.eWayBill.count({ where }),
  ]);

  return { items, total, page: input.page, limit: input.limit };
}

export async function getGstr1Preview(businessId: string, month: number, year: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const [invoices, creditNotes] = await Promise.all([
    prisma.saleInvoice.findMany({
      where: {
        businessId,
        invoiceDate: { gte: startDate, lte: endDate },
        status: 'CONFIRMED',
      },
      include: {
        customer: { select: { name: true, gstin: true, stateCode: true } },
      },
    }),
    // Confirmed sales returns are credit notes (GSTR-1 table 9B). They carry
    // the invoice they reverse, which the return has to be filed against.
    prisma.salesReturn.findMany({
      where: {
        businessId,
        returnDate: { gte: startDate, lte: endDate },
        status: 'CONFIRMED',
      },
      include: {
        customer: { select: { name: true, gstin: true, stateCode: true } },
        saleInvoice: { select: { documentNumber: true, invoiceDate: true } },
      },
    }),
  ]);

  const b2b = invoices.filter((inv) => inv.customer?.gstin);

  // Decimal accumulation, converted once per figure. Summing the `Number()`
  // forms drifts — a month of invoices can file a return that is a paisa off
  // the documents behind it, which is exactly the mismatch a GST notice is
  // raised over.
  const sum = <T,>(rows: T[], pick: (row: T) => Prisma.Decimal | null) =>
    sumBy(rows, pick);

  return {
    period: `${month.toString().padStart(2, '0')}/${year}`,
    b2b: b2b.map((inv) => ({
      id: inv.id,
      documentNumber: inv.documentNumber,
      invoiceDate: inv.invoiceDate,
      buyerGstin: inv.customer?.gstin,
      buyerName: inv.customer?.name,
      taxableAmount: inv.taxableAmount ? Number(inv.taxableAmount) : 0,
      cgstAmount: inv.cgstAmount ? Number(inv.cgstAmount) : 0,
      sgstAmount: inv.sgstAmount ? Number(inv.sgstAmount) : 0,
      igstAmount: inv.igstAmount ? Number(inv.igstAmount) : 0,
      cessAmount: inv.cessAmount ? Number(inv.cessAmount) : 0,
      grandTotal: Number(inv.grandTotal),
    })),
    creditNotes: creditNotes.map((cn) => ({
      id: cn.id,
      documentNumber: cn.documentNumber,
      returnDate: cn.returnDate,
      againstInvoiceNumber: cn.saleInvoice?.documentNumber ?? null,
      againstInvoiceDate: cn.saleInvoice?.invoiceDate ?? null,
      buyerGstin: cn.customer?.gstin,
      buyerName: cn.customer?.name,
      taxableAmount: cn.taxableAmount ? Number(cn.taxableAmount) : 0,
      cgstAmount: cn.cgstAmount ? Number(cn.cgstAmount) : 0,
      sgstAmount: cn.sgstAmount ? Number(cn.sgstAmount) : 0,
      igstAmount: cn.igstAmount ? Number(cn.igstAmount) : 0,
      cessAmount: cn.cessAmount ? Number(cn.cessAmount) : 0,
      grandTotal: Number(cn.grandTotal),
    })),
    // Gross outward supply, before credit notes are applied.
    summary: {
      taxableAmount: toMoneyNumber(sum(invoices, (i) => i.taxableAmount)),
      cgst: toMoneyNumber(sum(invoices, (i) => i.cgstAmount)),
      sgst: toMoneyNumber(sum(invoices, (i) => i.sgstAmount)),
      igst: toMoneyNumber(sum(invoices, (i) => i.igstAmount)),
    },
    creditNoteSummary: {
      taxableAmount: toMoneyNumber(sum(creditNotes, (c) => c.taxableAmount)),
      cgst: toMoneyNumber(sum(creditNotes, (c) => c.cgstAmount)),
      sgst: toMoneyNumber(sum(creditNotes, (c) => c.sgstAmount)),
      igst: toMoneyNumber(sum(creditNotes, (c) => c.igstAmount)),
    },
    // What is actually payable: supplies less the credit notes against them.
    netSummary: {
      taxableAmount: toMoneyNumber(
        sum(invoices, (i) => i.taxableAmount).minus(
          sum(creditNotes, (c) => c.taxableAmount),
        ),
      ),
      cgst: toMoneyNumber(
        sum(invoices, (i) => i.cgstAmount).minus(sum(creditNotes, (c) => c.cgstAmount)),
      ),
      sgst: toMoneyNumber(
        sum(invoices, (i) => i.sgstAmount).minus(sum(creditNotes, (c) => c.sgstAmount)),
      ),
      igst: toMoneyNumber(
        sum(invoices, (i) => i.igstAmount).minus(sum(creditNotes, (c) => c.igstAmount)),
      ),
    },
  };
}

export async function getGstr3bPreview(businessId: string, month: number, year: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const gstSums = {
    taxableAmount: true,
    cgstAmount: true,
    sgstAmount: true,
    igstAmount: true,
    cessAmount: true,
  } as const;

  const [salesAgg, purchaseAgg, creditNoteAgg, debitNoteAgg] = await Promise.all([
    prisma.saleInvoice.aggregate({
      where: { businessId, invoiceDate: { gte: startDate, lte: endDate }, status: 'CONFIRMED' },
      _sum: gstSums,
    }),
    prisma.purchaseOrder.aggregate({
      where: { businessId, orderDate: { gte: startDate, lte: endDate }, status: 'CONFIRMED' },
      _sum: gstSums,
    }),
    // Credit notes reduce outward liability; debit notes reduce input tax
    // credit. Leaving them out means paying tax on refunded sales and
    // claiming credit on goods already sent back.
    prisma.salesReturn.aggregate({
      where: { businessId, returnDate: { gte: startDate, lte: endDate }, status: 'CONFIRMED' },
      _sum: gstSums,
    }),
    prisma.purchaseReturn.aggregate({
      where: { businessId, returnDate: { gte: startDate, lte: endDate }, status: 'CONFIRMED' },
      _sum: gstSums,
    }),
  ]);

  // Subtracted as Decimal. Two exact 2-decimal values converted to `number`
  // first can differ from their true difference by a fraction of a paisa, and
  // this figure is filed.
  const net = (
    gross: typeof salesAgg._sum,
    reversal: typeof salesAgg._sum,
    field: keyof typeof salesAgg._sum,
  ) => toMoneyNumber(money(gross[field]).minus(money(reversal[field])));

  return {
    period: `${month.toString().padStart(2, '0')}/${year}`,
    // Net of credit notes — this is the liability actually payable.
    outward: {
      taxableAmount: net(salesAgg._sum, creditNoteAgg._sum, 'taxableAmount'),
      cgst: net(salesAgg._sum, creditNoteAgg._sum, 'cgstAmount'),
      sgst: net(salesAgg._sum, creditNoteAgg._sum, 'sgstAmount'),
      igst: net(salesAgg._sum, creditNoteAgg._sum, 'igstAmount'),
    },
    // Net of debit notes — credit cannot be claimed on returned goods.
    itc: {
      cgst: net(purchaseAgg._sum, debitNoteAgg._sum, 'cgstAmount'),
      sgst: net(purchaseAgg._sum, debitNoteAgg._sum, 'sgstAmount'),
      igst: net(purchaseAgg._sum, debitNoteAgg._sum, 'igstAmount'),
    },
    // The gross figures and their reversals, kept separate so a filing can be
    // reconciled line by line rather than only in aggregate.
    outwardGross: {
      taxableAmount: toMoneyNumber(salesAgg._sum.taxableAmount),
      cgst: toMoneyNumber(salesAgg._sum.cgstAmount),
      sgst: toMoneyNumber(salesAgg._sum.sgstAmount),
      igst: toMoneyNumber(salesAgg._sum.igstAmount),
    },
    creditNotes: {
      taxableAmount: toMoneyNumber(creditNoteAgg._sum.taxableAmount),
      cgst: toMoneyNumber(creditNoteAgg._sum.cgstAmount),
      sgst: toMoneyNumber(creditNoteAgg._sum.sgstAmount),
      igst: toMoneyNumber(creditNoteAgg._sum.igstAmount),
    },
    debitNotes: {
      taxableAmount: toMoneyNumber(debitNoteAgg._sum.taxableAmount),
      cgst: toMoneyNumber(debitNoteAgg._sum.cgstAmount),
      sgst: toMoneyNumber(debitNoteAgg._sum.sgstAmount),
      igst: toMoneyNumber(debitNoteAgg._sum.igstAmount),
    },
  };
}
