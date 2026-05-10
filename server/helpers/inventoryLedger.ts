import { prisma } from '@seed/database';
import { Prisma } from '@seed/database/generated/client';
import { TRPCError } from '@trpc/server';

type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;

/**
 * Inventory Ledger Engine
 *
 * This is the CORE of the inventory system. Every stock movement (purchase,
 * sale, return, transfer, adjustment, damage) flows through these functions.
 *
 * Architecture:
 * 1. createLedgerEntry()  — records the fact of stock movement
 * 2. upsertStockSummary() — updates the materialized stock position
 * 3. updateProductStockCache() — updates Product.currentStockLevel
 *
 * The ledger is APPEND-ONLY. Stock summaries are computed aggregates.
 * The Product.currentStockLevel is a denormalised convenience cache.
 *
 * All three functions execute within the caller's $transaction context
 * by accepting a Prisma transaction client (tx).
 */

// Type for a Prisma interactive transaction client
type PrismaTransaction = Parameters<
  Parameters<typeof prisma.$transaction>[0]
>[0];

// ---------- Types ----------

export interface LedgerEntryInput {
  transactionType:
    | 'PURCHASE_IN'
    | 'SALE_OUT'
    | 'SALES_RETURN_IN'
    | 'PURCHASE_RETURN_OUT'
    | 'ADJUSTMENT_IN'
    | 'ADJUSTMENT_OUT'
    | 'TRANSFER_IN'
    | 'TRANSFER_OUT'
    | 'DAMAGE_OUT'
    | 'EXPIRED_OUT';
  productId: string;
  warehouseId: string;
  shelfId?: string | null;
  batchId?: string | null;
  businessId: string;
  quantity: number | Decimal; // positive always — direction derived from type
  unitCost: number | Decimal;
  referenceTable?: string;
  referenceId?: string;
  transactionDate?: Date;
  notes?: string;
}

// Inbound types — stock increases
const INBOUND_TYPES = new Set([
  'PURCHASE_IN',
  'SALES_RETURN_IN',
  'ADJUSTMENT_IN',
  'TRANSFER_IN',
]);

// ---------- Core Functions ----------

/**
 * Create a single ledger entry.
 *
 * Automatically determines quantityIn vs quantityOut from transactionType.
 * Also cascades to upsertStockSummary and updateProductStockCache.
 *
 * MUST be called inside a prisma.$transaction interactive block.
 */
export async function createLedgerEntry(
  tx: PrismaTransaction,
  input: LedgerEntryInput,
) {
  const qty = new Decimal(input.quantity.toString());
  const cost = new Decimal(input.unitCost.toString());
  const isInbound = INBOUND_TYPES.has(input.transactionType);
  const quantityIn = isInbound ? qty : new Decimal(0);
  const quantityOut = isInbound ? new Decimal(0) : qty;
  const totalCost = qty.mul(cost);

  // 1. Create ledger entry
  const entry = await tx.inventoryLedger.create({
    data: {
      transactionType: input.transactionType,
      referenceTable: input.referenceTable,
      referenceId: input.referenceId,
      quantityIn,
      quantityOut,
      unitCost: cost,
      totalCost,
      transactionDate: input.transactionDate ?? new Date(),
      notes: input.notes,
      productId: input.productId,
      warehouseId: input.warehouseId,
      shelfId: input.shelfId ?? null,
      batchId: input.batchId ?? null,
      businessId: input.businessId,
    },
  });

  // 2. Update stock summary
  await upsertStockSummary(tx, {
    productId: input.productId,
    warehouseId: input.warehouseId,
    shelfId: input.shelfId ?? null,
    batchId: input.batchId ?? null,
    quantityDelta: isInbound ? qty : qty.neg(),
    valueDelta: isInbound ? totalCost : totalCost.neg(),
  });

  // 3. Update product cached stock level
  await updateProductStockCache(tx, input.productId);

  return entry;
}

/**
 * Batch-create multiple ledger entries (e.g. for a multi-line GRN or invoice).
 * Each item gets its own ledger entry + stock update.
 */
export async function createLedgerEntries(
  tx: PrismaTransaction,
  entries: LedgerEntryInput[],
) {
  const results = [];
  for (const entry of entries) {
    results.push(await createLedgerEntry(tx, entry));
  }
  return results;
}

// ---------- Stock Summary ----------

interface StockSummaryDelta {
  productId: string;
  warehouseId: string;
  shelfId: string | null;
  batchId: string | null;
  quantityDelta: Decimal;
  valueDelta: Decimal;
}

/**
 * Upsert the InventoryStock row for a specific (product, warehouse, shelf, batch) tuple.
 *
 * Uses the @@unique([productId, warehouseId, shelfId, batchId]) compound key.
 *
 * If the row doesn't exist, creates it with the delta as the initial value.
 * If it exists, increments currentQuantity and currentValue by the delta.
 */
async function upsertStockSummary(
  tx: PrismaTransaction,
  delta: StockSummaryDelta,
) {
  // Prisma doesn't support upsert on compound unique with nullable fields perfectly,
  // so we use a findFirst + create/update pattern.
  const existing = await tx.inventoryStock.findFirst({
    where: {
      productId: delta.productId,
      warehouseId: delta.warehouseId,
      shelfId: delta.shelfId,
      batchId: delta.batchId,
    },
  });

  if (existing) {
    await tx.inventoryStock.update({
      where: { id: existing.id },
      data: {
        currentQuantity: { increment: delta.quantityDelta },
        currentValue: { increment: delta.valueDelta },
      },
    });
  } else {
    await tx.inventoryStock.create({
      data: {
        productId: delta.productId,
        warehouseId: delta.warehouseId,
        shelfId: delta.shelfId,
        batchId: delta.batchId,
        currentQuantity: delta.quantityDelta,
        currentValue: delta.valueDelta,
      },
    });
  }
}

// ---------- Product Stock Cache ----------

/**
 * Recalculate and update Product.currentStockLevel from InventoryStock.
 *
 * This is a convenience denormalisation — the source of truth is InventoryStock.
 * Sum of all InventoryStock.currentQuantity for this product = product's total stock.
 */
async function updateProductStockCache(
  tx: PrismaTransaction,
  productId: string,
) {
  const aggregate = await tx.inventoryStock.aggregate({
    where: { productId },
    _sum: { currentQuantity: true },
  });

  const totalQuantity = aggregate._sum.currentQuantity ?? new Decimal(0);

  await tx.product.update({
    where: { id: productId },
    data: { currentStockLevel: totalQuantity },
  });
}

// ---------- Stock Validation Helpers ----------

/**
 * Check if sufficient stock exists for a given product at a specific location.
 * Used before sales, transfers, damage write-offs.
 *
 * Returns the stock row if found and sufficient, otherwise throws.
 */
export async function validateStockAvailability(
  tx: PrismaTransaction,
  params: {
    productId: string;
    warehouseId: string;
    shelfId?: string | null;
    batchId?: string | null;
    requiredQuantity: number | Decimal;
    productName?: string;
  },
) {
  const stock = await tx.inventoryStock.findFirst({
    where: {
      productId: params.productId,
      warehouseId: params.warehouseId,
      shelfId: params.shelfId ?? null,
      batchId: params.batchId ?? null,
    },
  });

  const required = new Decimal(params.requiredQuantity.toString());

  // Check if product allows negative stock
  const product = await tx.product.findUnique({
    where: { id: params.productId },
    select: { allowNegative: true, name: true },
  });

  const name = params.productName ?? product?.name ?? 'Product';

  if (!stock || stock.currentQuantity.lt(required)) {
    if (product?.allowNegative) {
      return stock; // Allow negative — caller proceeds
    }
    const available = stock?.currentQuantity ?? new Decimal(0);
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Insufficient stock for "${name}": available ${available.toFixed(2)}, required ${required.toFixed(2)}`,
    });
  }

  return stock;
}

/**
 * Get the current stock quantity for a product at a specific location.
 * Returns 0 if no stock row exists.
 */
export async function getStockQuantity(
  tx: PrismaTransaction,
  params: {
    productId: string;
    warehouseId: string;
    shelfId?: string | null;
    batchId?: string | null;
  },
): Promise<Decimal> {
  const stock = await tx.inventoryStock.findFirst({
    where: {
      productId: params.productId,
      warehouseId: params.warehouseId,
      shelfId: params.shelfId ?? null,
      batchId: params.batchId ?? null,
    },
    select: { currentQuantity: true },
  });

  return stock?.currentQuantity ?? new Decimal(0);
}
