import { prisma } from '@seed/database';
import { TRPCError } from '@trpc/server';
import { computeInvoice, validateGstin, stateCodeFromGstin } from '@seed/tax';

// Built-in GST tax rates for India
const STANDARD_TAX_RATES = [
  { id: '0', label: 'Exempt (0%)', percent: 0 },
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
    buyerStateCode: string;
    buyerGstin?: string;
  },
) {
  const gstProfile = await prisma.gSTRegistration.findUnique({ where: { businessId } });
  const sellerStateCode = gstProfile?.stateCode ?? '27'; // Default MH

  return computeInvoice(
    input.lines,
    sellerStateCode,
    input.buyerStateCode,
    input.buyerGstin,
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

  const invoices = await prisma.saleInvoice.findMany({
    where: {
      businessId,
      invoiceDate: { gte: startDate, lte: endDate },
      status: 'CONFIRMED',
    },
    include: {
      customer: { select: { name: true, gstin: true, stateCode: true } },
    },
  });

  const b2b = invoices.filter((inv) => inv.customer?.gstin);

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
    summary: {
      taxableAmount: invoices.reduce((s, i) => s + (i.taxableAmount ? Number(i.taxableAmount) : 0), 0),
      cgst: invoices.reduce((s, i) => s + (i.cgstAmount ? Number(i.cgstAmount) : 0), 0),
      sgst: invoices.reduce((s, i) => s + (i.sgstAmount ? Number(i.sgstAmount) : 0), 0),
      igst: invoices.reduce((s, i) => s + (i.igstAmount ? Number(i.igstAmount) : 0), 0),
    },
  };
}

export async function getGstr3bPreview(businessId: string, month: number, year: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const [salesAgg, purchaseAgg] = await Promise.all([
    prisma.saleInvoice.aggregate({
      where: { businessId, invoiceDate: { gte: startDate, lte: endDate }, status: 'CONFIRMED' },
      _sum: { taxableAmount: true, cgstAmount: true, sgstAmount: true, igstAmount: true, cessAmount: true },
    }),
    prisma.purchaseOrder.aggregate({
      where: { businessId, orderDate: { gte: startDate, lte: endDate }, status: 'CONFIRMED' },
      _sum: { taxableAmount: true, cgstAmount: true, sgstAmount: true, igstAmount: true, cessAmount: true },
    }),
  ]);

  return {
    period: `${month.toString().padStart(2, '0')}/${year}`,
    outward: {
      taxableAmount: salesAgg._sum.taxableAmount ? Number(salesAgg._sum.taxableAmount) : 0,
      cgst: salesAgg._sum.cgstAmount ? Number(salesAgg._sum.cgstAmount) : 0,
      sgst: salesAgg._sum.sgstAmount ? Number(salesAgg._sum.sgstAmount) : 0,
      igst: salesAgg._sum.igstAmount ? Number(salesAgg._sum.igstAmount) : 0,
    },
    itc: {
      cgst: purchaseAgg._sum.cgstAmount ? Number(purchaseAgg._sum.cgstAmount) : 0,
      sgst: purchaseAgg._sum.sgstAmount ? Number(purchaseAgg._sum.sgstAmount) : 0,
      igst: purchaseAgg._sum.igstAmount ? Number(purchaseAgg._sum.igstAmount) : 0,
    },
  };
}
