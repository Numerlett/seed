import { prisma } from '@seed/database';

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
  });

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
    invoiceDate: { gte: input.dateFrom, lte: input.dateTo },
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
      taxableAmount: Number(inv.taxableAmount ?? 0),
      cgst: Number(inv.cgstAmount ?? 0),
      sgst: Number(inv.sgstAmount ?? 0),
      igst: Number(inv.igstAmount ?? 0),
      grandTotal: Number(inv.grandTotal),
    })),
    total,
    page: input.page,
    summary: {
      grandTotal: Number(agg?._sum?.grandTotal ?? 0),
      taxableAmount: Number(agg?._sum?.taxableAmount ?? 0),
      cgst: Number(agg?._sum?.cgstAmount ?? 0),
      sgst: Number(agg?._sum?.sgstAmount ?? 0),
      igst: Number(agg?._sum?.igstAmount ?? 0),
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
    orderDate: { gte: input.dateFrom, lte: input.dateTo },
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
      taxableAmount: Number(po.taxableAmount ?? 0),
      cgst: Number(po.cgstAmount ?? 0),
      sgst: Number(po.sgstAmount ?? 0),
      igst: Number(po.igstAmount ?? 0),
      grandTotal: Number(po.grandTotal),
    })),
    total,
    page: input.page,
    summary: {
      grandTotal: Number(agg?._sum?.grandTotal ?? 0),
      taxableAmount: Number(agg?._sum?.taxableAmount ?? 0),
    },
  };
}

export async function getPartyStatement(
  businessId: string,
  partyId: string,
  input: { dateFrom: Date; dateTo: Date },
) {
  const [sales, purchases, payments] = await Promise.all([
    prisma.saleInvoice.findMany({
      where: { businessId, customerId: partyId, invoiceDate: { gte: input.dateFrom, lte: input.dateTo }, status: 'CONFIRMED' },
      orderBy: { invoiceDate: 'asc' },
      select: { id: true, documentNumber: true, invoiceDate: true, grandTotal: true },
    }),
    prisma.purchaseOrder.findMany({
      where: { businessId, supplierId: partyId, orderDate: { gte: input.dateFrom, lte: input.dateTo }, status: 'CONFIRMED' },
      orderBy: { orderDate: 'asc' },
      select: { id: true, documentNumber: true, orderDate: true, grandTotal: true },
    }),
    prisma.payment.findMany({
      where: { businessId, partyId, date: { gte: input.dateFrom, lte: input.dateTo } },
      orderBy: { date: 'asc' },
      select: { id: true, documentNumber: true, date: true, amount: true, type: true },
    }),
  ]);

  const ledger = [
    ...sales.map((s) => ({ date: s.invoiceDate, docNo: s.documentNumber, description: 'Sale Invoice', debit: Number(s.grandTotal), credit: 0 })),
    ...purchases.map((p) => ({ date: p.orderDate, docNo: p.documentNumber, description: 'Purchase', debit: 0, credit: Number(p.grandTotal) })),
    ...payments.map((p) => ({ date: p.date, docNo: p.documentNumber, description: `Payment ${p.type}`, debit: p.type === 'MADE' ? 0 : Number(p.amount), credit: p.type === 'RECEIVED' ? 0 : Number(p.amount) })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningBalance = 0;
  const rows = ledger.map((row) => {
    runningBalance += row.debit - row.credit;
    return { ...row, balance: runningBalance };
  });

  return { rows, closingBalance: runningBalance };
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
