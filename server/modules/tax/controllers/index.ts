import { prisma } from '@seed/database';
import { TRPCError } from '@trpc/server';
import {
  computeInvoice,
  toPlainNumbers,
  validateGstin,
  stateCodeFromGstin,
} from '@seed/tax';
import { resolveSellerStateCode } from '../../../lib/tax';

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

export async function generateIrn(businessId: string, invoiceId: string) {
  const invoice = await prisma.saleInvoice.findFirst({
    where: { id: invoiceId, businessId },
    include: {
      items: { include: { product: true } },
      customer: { include: { addresses: true } },
      business: { include: { gstRegistration: true } },
    },
  });

  if (!invoice) throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });

  const existing = await prisma.eInvoice.findUnique({ where: { invoiceId } });
  if (existing?.status === 'GENERATED') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'IRN already generated for this invoice' });
  }

  return prisma.eInvoice.upsert({
    where: { invoiceId },
    create: { invoiceId, businessId, status: 'PENDING' },
    update: { status: 'PENDING', irn: null, ackNo: null, ackDate: null },
  });
}

export async function cancelIrn(
  businessId: string,
  invoiceId: string,
  reason: string,
  remarks: string,
) {
  const einvoice = await prisma.eInvoice.findUnique({ where: { invoiceId } });
  if (!einvoice || einvoice.status !== 'GENERATED') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'No active IRN to cancel' });
  }

  return prisma.eInvoice.update({
    where: { invoiceId },
    data: { status: 'CANCELLATION_PENDING', cancelReason: remarks, cancelledAt: new Date() },
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
  const einvoice = await prisma.eInvoice.findUnique({ where: { invoiceId: input.invoiceId } });
  if (!einvoice || !einvoice.irn) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Generate IRN first before creating e-way bill' });
  }

  const { invoiceId, ...rest } = input;
  return prisma.eWayBill.upsert({
    where: { invoiceId },
    create: { invoiceId, businessId, status: 'PENDING', ...rest },
    update: { status: 'PENDING', ...rest },
  });
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
  const sum = <T,>(rows: T[], pick: (row: T) => unknown) =>
    rows.reduce((s, row) => s + (pick(row) ? Number(pick(row)) : 0), 0);

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
      taxableAmount: sum(invoices, (i) => i.taxableAmount),
      cgst: sum(invoices, (i) => i.cgstAmount),
      sgst: sum(invoices, (i) => i.sgstAmount),
      igst: sum(invoices, (i) => i.igstAmount),
    },
    creditNoteSummary: {
      taxableAmount: sum(creditNotes, (c) => c.taxableAmount),
      cgst: sum(creditNotes, (c) => c.cgstAmount),
      sgst: sum(creditNotes, (c) => c.sgstAmount),
      igst: sum(creditNotes, (c) => c.igstAmount),
    },
    // What is actually payable: supplies less the credit notes against them.
    netSummary: {
      taxableAmount:
        sum(invoices, (i) => i.taxableAmount) - sum(creditNotes, (c) => c.taxableAmount),
      cgst: sum(invoices, (i) => i.cgstAmount) - sum(creditNotes, (c) => c.cgstAmount),
      sgst: sum(invoices, (i) => i.sgstAmount) - sum(creditNotes, (c) => c.sgstAmount),
      igst: sum(invoices, (i) => i.igstAmount) - sum(creditNotes, (c) => c.igstAmount),
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

  const net = (
    gross: typeof salesAgg._sum,
    reversal: typeof salesAgg._sum,
    field: keyof typeof salesAgg._sum,
  ) => Number(gross[field] ?? 0) - Number(reversal[field] ?? 0);

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
      taxableAmount: Number(salesAgg._sum.taxableAmount ?? 0),
      cgst: Number(salesAgg._sum.cgstAmount ?? 0),
      sgst: Number(salesAgg._sum.sgstAmount ?? 0),
      igst: Number(salesAgg._sum.igstAmount ?? 0),
    },
    creditNotes: {
      taxableAmount: Number(creditNoteAgg._sum.taxableAmount ?? 0),
      cgst: Number(creditNoteAgg._sum.cgstAmount ?? 0),
      sgst: Number(creditNoteAgg._sum.sgstAmount ?? 0),
      igst: Number(creditNoteAgg._sum.igstAmount ?? 0),
    },
    debitNotes: {
      taxableAmount: Number(debitNoteAgg._sum.taxableAmount ?? 0),
      cgst: Number(debitNoteAgg._sum.cgstAmount ?? 0),
      sgst: Number(debitNoteAgg._sum.sgstAmount ?? 0),
      igst: Number(debitNoteAgg._sum.igstAmount ?? 0),
    },
  };
}
