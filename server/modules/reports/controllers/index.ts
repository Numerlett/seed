import { prisma } from '@seed/database';
import { money, toMoneyNumber } from '@seed/accounting';
import { inclusiveRange } from '../../../helpers/dateRange';
import { logger } from '../../../helpers/logger';

/**
 * Ceiling on rows loaded for reports that cannot be paginated without changing
 * their meaning. Reaching it means the report is too wide to be useful anyway.
 */
const MAX_STATEMENT_ROWS_PER_SOURCE = 1000;
const MAX_STOCK_SUMMARY_ROWS = 5000;

export async function getStockSummary(businessId: string, warehouseId?: string) {
  // InventoryStock doesn't have businessId — filter via warehouse
  const warehouses = await prisma.warehouse.findMany({
    where: { businessId, ...(warehouseId ? { id: warehouseId } : {}) },
    select: { id: true },
  });
  const warehouseIds = warehouses.map((w) => w.id);

  const stocks = await prisma.inventoryStock.findMany({
    where: { warehouseId: { in: warehouseIds } },
    include: {
      product: { select: { name: true, sku: true, unit: true } },
      warehouse: { select: { name: true } },
    },
    orderBy: { product: { name: 'asc' } },
    take: MAX_STOCK_SUMMARY_ROWS,
  });

  if (stocks.length === MAX_STOCK_SUMMARY_ROWS) {
    logger.warn(
      { businessId, warehouseId, cap: MAX_STOCK_SUMMARY_ROWS },
      'Stock summary hit its row cap and is incomplete; it needs pagination',
    );
  }

  return stocks.map((s) => ({
    productId: s.productId,
    sku: s.product.sku,
    name: s.product.name,
    unit: s.product.unit,
    warehouse: s.warehouse.name,
    quantity: Number(s.currentQuantity),
  }));
}

export async function getSalesRegister(
  businessId: string,
  input: { dateFrom: Date; dateTo: Date; page: number; limit: number },
) {
  const skip = (input.page - 1) * input.limit;
  const where = {
    businessId,
    invoiceDate: inclusiveRange(input.dateFrom, input.dateTo),
    status: 'CONFIRMED' as const,
  };

  const [items, total, agg] = await Promise.all([
    prisma.saleInvoice.findMany({
      where,
      skip,
      take: input.limit,
      orderBy: { invoiceDate: 'desc' },
      include: { customer: { select: { name: true, gstin: true } } },
    }),
    prisma.saleInvoice.count({ where }),
    prisma.saleInvoice.aggregate({
      where,
      _sum: { grandTotal: true, taxableAmount: true, cgstAmount: true, sgstAmount: true, igstAmount: true },
    }),
  ]);

  return {
    items: items.map((inv) => ({
      id: inv.id,
      documentNumber: inv.documentNumber,
      invoiceDate: inv.invoiceDate,
      customerName: inv.customer?.name,
      customerGstin: inv.customer?.gstin,
      taxableAmount: toMoneyNumber(inv.taxableAmount),
      cgst: toMoneyNumber(inv.cgstAmount),
      sgst: toMoneyNumber(inv.sgstAmount),
      igst: toMoneyNumber(inv.igstAmount),
      grandTotal: toMoneyNumber(inv.grandTotal),
    })),
    total,
    page: input.page,
    summary: {
      grandTotal: toMoneyNumber(agg?._sum?.grandTotal),
      taxableAmount: toMoneyNumber(agg?._sum?.taxableAmount),
      cgst: toMoneyNumber(agg?._sum?.cgstAmount),
      sgst: toMoneyNumber(agg?._sum?.sgstAmount),
      igst: toMoneyNumber(agg?._sum?.igstAmount),
    },
  };
}

export async function getPurchaseRegister(
  businessId: string,
  input: { dateFrom: Date; dateTo: Date; page: number; limit: number },
) {
  const skip = (input.page - 1) * input.limit;
  const where = {
    businessId,
    orderDate: inclusiveRange(input.dateFrom, input.dateTo),
    status: 'CONFIRMED' as const,
  };

  const [items, total, agg] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      skip,
      take: input.limit,
      orderBy: { orderDate: 'desc' },
      include: { supplier: { select: { name: true, gstin: true } } },
    }),
    prisma.purchaseOrder.count({ where }),
    prisma.purchaseOrder.aggregate({
      where,
      _sum: { grandTotal: true, taxableAmount: true, cgstAmount: true, sgstAmount: true, igstAmount: true },
    }),
  ]);

  return {
    items: items.map((po) => ({
      id: po.id,
      documentNumber: po.documentNumber,
      orderDate: po.orderDate,
      supplierName: po.supplier?.name,
      supplierGstin: po.supplier?.gstin,
      taxableAmount: toMoneyNumber(po.taxableAmount),
      cgst: toMoneyNumber(po.cgstAmount),
      sgst: toMoneyNumber(po.sgstAmount),
      igst: toMoneyNumber(po.igstAmount),
      grandTotal: toMoneyNumber(po.grandTotal),
    })),
    total,
    page: input.page,
    summary: {
      grandTotal: toMoneyNumber(agg?._sum?.grandTotal),
      taxableAmount: toMoneyNumber(agg?._sum?.taxableAmount),
    },
  };
}

export async function getPartyStatement(
  businessId: string,
  partyId: string,
  input: { dateFrom: Date; dateTo: Date },
) {
  // A running-balance statement needs every row in the range, so it cannot be
  // paginated without changing what the balance means. Cap each source instead
  // and tell the caller when the range was too wide, rather than loading an
  // unbounded result set into memory.
  const take = MAX_STATEMENT_ROWS_PER_SOURCE + 1;

  const [sales, purchases, payments] = await Promise.all([
    prisma.saleInvoice.findMany({
      where: { businessId, customerId: partyId, invoiceDate: inclusiveRange(input.dateFrom, input.dateTo), status: 'CONFIRMED' },
      orderBy: { invoiceDate: 'asc' },
      select: { id: true, documentNumber: true, invoiceDate: true, grandTotal: true },
      take,
    }),
    prisma.purchaseOrder.findMany({
      where: { businessId, supplierId: partyId, orderDate: inclusiveRange(input.dateFrom, input.dateTo), status: 'CONFIRMED' },
      orderBy: { orderDate: 'asc' },
      select: { id: true, documentNumber: true, orderDate: true, grandTotal: true },
      take,
    }),
    prisma.payment.findMany({
      where: { businessId, partyId, date: inclusiveRange(input.dateFrom, input.dateTo) },
      orderBy: { date: 'asc' },
      select: { id: true, documentNumber: true, date: true, amount: true, type: true },
      take,
    }),
  ]);

  const truncated =
    sales.length > MAX_STATEMENT_ROWS_PER_SOURCE ||
    purchases.length > MAX_STATEMENT_ROWS_PER_SOURCE ||
    payments.length > MAX_STATEMENT_ROWS_PER_SOURCE;

  // Amounts stay Decimal through the sort and the running total. Accumulating
  // `Number` deltas over a few thousand statement rows drifts far enough to
  // show a closing balance that disagrees with the invoices it is made of.
  const zero = money(0);
  const ledger = [
    ...sales.map((s) => ({ date: s.invoiceDate, docNo: s.documentNumber, description: 'Sale Invoice', debit: money(s.grandTotal), credit: zero })),
    ...purchases.map((p) => ({ date: p.orderDate, docNo: p.documentNumber, description: 'Purchase', debit: zero, credit: money(p.grandTotal) })),
    ...payments.map((p) => ({ date: p.date, docNo: p.documentNumber, description: `Payment ${p.type}`, debit: p.type === 'MADE' ? zero : money(p.amount), credit: p.type === 'RECEIVED' ? zero : money(p.amount) })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningBalance = zero;
  const rows = ledger.map((row) => {
    runningBalance = runningBalance.plus(row.debit).minus(row.credit);
    return {
      date: row.date,
      docNo: row.docNo,
      description: row.description,
      debit: toMoneyNumber(row.debit),
      credit: toMoneyNumber(row.credit),
      balance: toMoneyNumber(runningBalance),
    };
  });

  return {
    rows,
    closingBalance: toMoneyNumber(runningBalance),
    truncated,
    ...(truncated && {
      truncationNotice: `Showing the first ${MAX_STATEMENT_ROWS_PER_SOURCE} entries per document type. Narrow the date range for a complete statement.`,
    }),
  };
}

export async function getLowStockReport(businessId: string) {
  const warehouses = await prisma.warehouse.findMany({ where: { businessId }, select: { id: true } });
  const warehouseIds = warehouses.map((w) => w.id);

  const stocks = await prisma.inventoryStock.findMany({
    where: { warehouseId: { in: warehouseIds } },
    include: {
      product: { select: { name: true, sku: true, unit: true, reorderLevel: true } },
      warehouse: { select: { name: true } },
    },
  });

  return stocks
    .filter((s) => s.product.reorderLevel != null && Number(s.currentQuantity) <= Number(s.product.reorderLevel))
    .map((s) => ({
      sku: s.product.sku,
      name: s.product.name,
      unit: s.product.unit,
      warehouse: s.warehouse.name,
      quantity: Number(s.currentQuantity),
      reorderLevel: Number(s.product.reorderLevel),
    }));
}
