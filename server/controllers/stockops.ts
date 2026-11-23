import { prisma } from '@seed/database';
import { Prisma } from '@seed/database/generated/client';
import { businessMemberProcedure } from '../trpc/procedures';
import * as z from 'zod';
import { TRPCError } from '@trpc/server';
import {
  stockAdjustmentSchema,
  stockTransferSchema,
  damageReportSchema,
} from '@seed/schemas';
import { handleControllerError } from '../helpers/controllerErrorHandler';
import { withDocumentNumber, DOC_PREFIXES } from '../helpers/documentNumber';
import {
  createLedgerEntry,
  lockProductsForUpdate,
  resolveOutboundCost,
  validateStockAvailability,
  getStockQuantity,
} from '../helpers/inventoryLedger';
import { postJournalEntry } from '../lib/accounting/post';
import { stockGainPosting, stockWriteOffPosting } from '@seed/accounting';

// =====================================================
// STOCK ADJUSTMENT CONTROLLERS
// =====================================================

/**
 * Create a Stock Adjustment (DRAFT).
 * adjustQuantity is computed as actualQuantity - systemQuantity.
 */
export const createStockAdjustment = businessMemberProcedure
  .input(stockAdjustmentSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const itemsData = input.items.map((item) => ({
        productId: item.productId,
        systemQuantity: item.systemQuantity,
        actualQuantity: item.actualQuantity,
        adjustQuantity: item.actualQuantity - item.systemQuantity,
        unitCost: item.unitCost,
        shelfId: item.shelfId,
        batchId: item.batchId,
      }));

      const adj = await withDocumentNumber(
        input.businessId,
        DOC_PREFIXES.STOCK_ADJUSTMENT,
        input.documentNumber,
        (documentNumber) =>
          prisma.stockAdjustment.create({
            data: {
              documentNumber,
              adjustmentDate: input.adjustmentDate ?? new Date(),
              reason: input.reason,
              notes: input.notes,
              warehouseId: input.warehouseId,
              businessId: input.businessId,
              items: { create: itemsData },
            },
            include: {
              items: {
                include: {
                  product: { select: { id: true, name: true, sku: true } },
                },
              },
              warehouse: { select: { id: true, name: true } },
            },
          }),
      );

      return adj;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'create stock adjustment',
        userId: ctx.userId,
      });
    }
  });

/**
 * List stock adjustments.
 */
export const getStockAdjustments = businessMemberProcedure
  .input(
    z.object({
      businessId: z.string(),
      status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']).optional(),
      warehouseId: z.string().optional(),
      search: z.string().optional(),
      pageSize: z.number().int().min(1).max(100).default(20),
      pageNumber: z.number().int().min(1).default(1),
    }),
  )
  .query(async ({ input, ctx }) => {
    try {
      const where: any = { businessId: input.businessId };

      if (input.status) where.status = input.status;
      if (input.warehouseId) where.warehouseId = input.warehouseId;
      if (input.search) {
        where.documentNumber = { contains: input.search, mode: 'insensitive' };
      }

      const [data, total] = await prisma.$transaction([
        prisma.stockAdjustment.findMany({
          where,
          include: {
            warehouse: { select: { id: true, name: true } },
            _count: { select: { items: true } },
          },
          orderBy: [{ adjustmentDate: 'desc' }, { id: 'asc' }],
          skip: (input.pageNumber - 1) * input.pageSize,
          take: input.pageSize,
        }),
        prisma.stockAdjustment.count({ where }),
      ]);

      return {
        data,
        pagination: {
          total,
          pageSize: input.pageSize,
          pageNumber: input.pageNumber,
          totalPages: Math.ceil(total / input.pageSize),
        },
      };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'fetch stock adjustments',
        userId: ctx.userId,
      });
    }
  });

/**
 * Get a single stock adjustment.
 */
export const getStockAdjustmentById = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .query(async ({ input, ctx }) => {
    try {
      const adj = await prisma.stockAdjustment.findFirst({
        where: { id: input.id, businessId: input.businessId },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true, unit: true },
              },
              shelf: { select: { id: true, shelfCode: true } },
              batch: { select: { id: true, batchNumber: true } },
            },
          },
          warehouse: { select: { id: true, name: true } },
        },
      });

      if (!adj) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Stock adjustment not found',
        });
      }

      return adj;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'fetch stock adjustment',
        userId: ctx.userId,
      });
    }
  });

/**
 * Confirm a stock adjustment.
 *
 * For each item:
 * - If adjustQuantity > 0: ADJUSTMENT_IN (stock increase)
 * - If adjustQuantity < 0: ADJUSTMENT_OUT (stock decrease) — requires stock validation
 */
export const confirmStockAdjustment = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    try {
      const adj = await prisma.stockAdjustment.findFirst({
        where: { id: input.id, businessId: input.businessId },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (!adj) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Stock adjustment not found',
        });
      }

      if (adj.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot confirm an adjustment with status "${adj.status}"`,
        });
      }

      const confirmed = await prisma.$transaction(async (tx) => {
        await lockProductsForUpdate(
          tx,
          adj.items.map((item) => item.productId),
        );

        // Value gained and lost by the count, kept apart so the books show a
        // surplus and a shortfall on the same document as what they are.
        let valueIn = new Prisma.Decimal(0);
        let valueOut = new Prisma.Decimal(0);

        for (const item of adj.items) {
          const adjustQty = new Prisma.Decimal(item.adjustQuantity.toString());

          if (adjustQty.isZero()) continue; // No change needed

          if (adjustQty.gt(0)) {
            // Stock increase
            valueIn = valueIn.plus(
              adjustQty.mul(new Prisma.Decimal(item.unitCost.toString())),
            );
            await createLedgerEntry(tx, {
              transactionType: 'ADJUSTMENT_IN',
              productId: item.productId,
              warehouseId: adj.warehouseId,
              shelfId: item.shelfId,
              batchId: item.batchId,
              businessId: input.businessId,
              quantity: adjustQty,
              unitCost: item.unitCost,
              referenceTable: 'stock_adjustments',
              referenceId: adj.id,
              transactionDate: adj.adjustmentDate,
              notes: `Adjustment ${adj.documentNumber} - ${item.product.name} (+${adjustQty})`,
            });
          } else {
            // Stock decrease — validate availability first
            const absQty = adjustQty.abs();
            await validateStockAvailability(tx, {
              productId: item.productId,
              warehouseId: adj.warehouseId,
              shelfId: item.shelfId,
              batchId: item.batchId,
              requiredQuantity: absQty,
              productName: item.product.name,
            });

            // Stock leaves at the value it is carried at, not at a figure
            // typed on the document. Writing off 5 units cannot be allowed to
            // remove a different amount of value than those 5 units represent.
            const unitCost = await resolveOutboundCost(tx, {
              productId: item.productId,
              warehouseId: adj.warehouseId,
              shelfId: item.shelfId,
              batchId: item.batchId,
            });

            valueOut = valueOut.plus(absQty.mul(unitCost));
            await createLedgerEntry(tx, {
              transactionType: 'ADJUSTMENT_OUT',
              productId: item.productId,
              warehouseId: adj.warehouseId,
              shelfId: item.shelfId,
              batchId: item.batchId,
              businessId: input.businessId,
              quantity: absQty,
              unitCost,
              referenceTable: 'stock_adjustments',
              referenceId: adj.id,
              transactionDate: adj.adjustmentDate,
              notes: `Adjustment ${adj.documentNumber} - ${item.product.name} (-${absQty})`,
            });
          }
        }

        // The stock subledger has moved, so the Inventory account must too.
        // A shortfall is a loss; a surplus is a gain booked against the same
        // account. Zero legs are dropped by postJournalEntry.
        await postJournalEntry(tx, {
          businessId: input.businessId,
          source: 'STOCK_ADJUSTMENT',
          sourceId: adj.id,
          date: adj.adjustmentDate,
          narration: `Stock Adjustment ${adj.documentNumber}`,
          postedBy: ctx.userId,
          lines: [
            ...stockGainPosting({ amount: valueIn.toFixed(2) }),
            ...stockWriteOffPosting({ amount: valueOut.toFixed(2) }),
          ],
        });

        return tx.stockAdjustment.update({
          where: { id: input.id },
          data: { status: 'CONFIRMED' },
          include: {
            items: {
              include: {
                product: { select: { id: true, name: true, sku: true } },
              },
            },
            warehouse: { select: { id: true, name: true } },
          },
        });
      });

      return confirmed;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'confirm stock adjustment',
        userId: ctx.userId,
      });
    }
  });

/**
 * Cancel a DRAFT stock adjustment.
 */
export const cancelStockAdjustment = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    try {
      const adj = await prisma.stockAdjustment.findFirst({
        where: { id: input.id, businessId: input.businessId },
      });

      if (!adj) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Stock adjustment not found',
        });
      }

      if (adj.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only DRAFT adjustments can be cancelled',
        });
      }

      return prisma.stockAdjustment.update({
        where: { id: input.id },
        data: { status: 'CANCELLED' },
      });
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'cancel stock adjustment',
        userId: ctx.userId,
      });
    }
  });

// =====================================================
// STOCK TRANSFER CONTROLLERS
// =====================================================

/**
 * Create a Stock Transfer (DRAFT).
 */
export const createStockTransfer = businessMemberProcedure
  .input(stockTransferSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      if (
        input.sourceWarehouseId === input.destWarehouseId &&
        input.sourceShelfId === input.destShelfId
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Source and destination must be different',
        });
      }

      const itemsData = input.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        batchId: item.batchId,
      }));

      const transfer = await withDocumentNumber(
        input.businessId,
        DOC_PREFIXES.STOCK_TRANSFER,
        input.documentNumber,
        (documentNumber) =>
          prisma.stockTransfer.create({
            data: {
              documentNumber,
              transferDate: input.transferDate ?? new Date(),
              notes: input.notes,
              sourceWarehouseId: input.sourceWarehouseId,
              sourceShelfId: input.sourceShelfId,
              destWarehouseId: input.destWarehouseId,
              destShelfId: input.destShelfId,
              businessId: input.businessId,
              items: { create: itemsData },
            },
            include: {
              items: {
                include: {
                  product: { select: { id: true, name: true, sku: true } },
                },
              },
              sourceWarehouse: { select: { id: true, name: true } },
              destWarehouse: { select: { id: true, name: true } },
            },
          }),
      );

      return transfer;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'create stock transfer',
        userId: ctx.userId,
      });
    }
  });

/**
 * List stock transfers.
 */
export const getStockTransfers = businessMemberProcedure
  .input(
    z.object({
      businessId: z.string(),
      status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']).optional(),
      warehouseId: z.string().optional(), // matches either source or dest
      search: z.string().optional(),
      pageSize: z.number().int().min(1).max(100).default(20),
      pageNumber: z.number().int().min(1).default(1),
    }),
  )
  .query(async ({ input, ctx }) => {
    try {
      const where: any = { businessId: input.businessId };

      if (input.status) where.status = input.status;
      if (input.warehouseId) {
        where.OR = [
          { sourceWarehouseId: input.warehouseId },
          { destWarehouseId: input.warehouseId },
        ];
      }
      if (input.search) {
        where.documentNumber = { contains: input.search, mode: 'insensitive' };
      }

      const [data, total] = await prisma.$transaction([
        prisma.stockTransfer.findMany({
          where,
          include: {
            sourceWarehouse: { select: { id: true, name: true } },
            destWarehouse: { select: { id: true, name: true } },
            _count: { select: { items: true } },
          },
          orderBy: [{ transferDate: 'desc' }, { id: 'asc' }],
          skip: (input.pageNumber - 1) * input.pageSize,
          take: input.pageSize,
        }),
        prisma.stockTransfer.count({ where }),
      ]);

      return {
        data,
        pagination: {
          total,
          pageSize: input.pageSize,
          pageNumber: input.pageNumber,
          totalPages: Math.ceil(total / input.pageSize),
        },
      };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'fetch stock transfers',
        userId: ctx.userId,
      });
    }
  });

/**
 * Get a single stock transfer.
 */
export const getStockTransferById = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .query(async ({ input, ctx }) => {
    try {
      const transfer = await prisma.stockTransfer.findFirst({
        where: { id: input.id, businessId: input.businessId },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true, unit: true },
              },
              batch: { select: { id: true, batchNumber: true } },
            },
          },
          sourceWarehouse: { select: { id: true, name: true } },
          sourceShelf: { select: { id: true, shelfCode: true } },
          destWarehouse: { select: { id: true, name: true } },
          destShelf: { select: { id: true, shelfCode: true } },
        },
      });

      if (!transfer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Stock transfer not found',
        });
      }

      return transfer;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'fetch stock transfer',
        userId: ctx.userId,
      });
    }
  });

/**
 * Confirm a stock transfer.
 *
 * Creates TWO ledger entries per item:
 * 1. TRANSFER_OUT from source warehouse/shelf
 * 2. TRANSFER_IN to destination warehouse/shelf
 */
export const confirmStockTransfer = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    try {
      const transfer = await prisma.stockTransfer.findFirst({
        where: { id: input.id, businessId: input.businessId },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (!transfer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Stock transfer not found',
        });
      }

      if (transfer.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot confirm a transfer with status "${transfer.status}"`,
        });
      }

      const confirmed = await prisma.$transaction(async (tx) => {
        await lockProductsForUpdate(
          tx,
          transfer.items.map((item) => item.productId),
        );

        for (const item of transfer.items) {
          // Validate source stock
          await validateStockAvailability(tx, {
            productId: item.productId,
            warehouseId: transfer.sourceWarehouseId,
            shelfId: transfer.sourceShelfId,
            batchId: item.batchId,
            requiredQuantity: item.quantity,
            productName: item.product.name,
          });

          // A transfer moves value, it does not create or destroy any. Both
          // legs use the cost the source location carries, so the total value
          // of inventory is identical before and after — with a figure typed
          // on the document, moving stock silently revalued it. For the same
          // reason a transfer posts nothing to the journal: Inventory is one
          // account for the whole business, and it does not change.
          const unitCost = await resolveOutboundCost(tx, {
            productId: item.productId,
            warehouseId: transfer.sourceWarehouseId,
            shelfId: transfer.sourceShelfId,
            batchId: item.batchId,
          });

          // TRANSFER_OUT from source
          await createLedgerEntry(tx, {
            transactionType: 'TRANSFER_OUT',
            productId: item.productId,
            warehouseId: transfer.sourceWarehouseId,
            shelfId: transfer.sourceShelfId,
            batchId: item.batchId,
            businessId: input.businessId,
            quantity: item.quantity,
            unitCost,
            referenceTable: 'stock_transfers',
            referenceId: transfer.id,
            transactionDate: transfer.transferDate,
            notes: `Transfer ${transfer.documentNumber} OUT - ${item.product.name}`,
          });

          // TRANSFER_IN to destination
          await createLedgerEntry(tx, {
            transactionType: 'TRANSFER_IN',
            productId: item.productId,
            warehouseId: transfer.destWarehouseId,
            shelfId: transfer.destShelfId,
            batchId: item.batchId,
            businessId: input.businessId,
            quantity: item.quantity,
            unitCost,
            referenceTable: 'stock_transfers',
            referenceId: transfer.id,
            transactionDate: transfer.transferDate,
            notes: `Transfer ${transfer.documentNumber} IN - ${item.product.name}`,
          });
        }

        return tx.stockTransfer.update({
          where: { id: input.id },
          data: { status: 'CONFIRMED' },
          include: {
            items: {
              include: {
                product: { select: { id: true, name: true, sku: true } },
              },
            },
            sourceWarehouse: { select: { id: true, name: true } },
            destWarehouse: { select: { id: true, name: true } },
          },
        });
      });

      return confirmed;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'confirm stock transfer',
        userId: ctx.userId,
      });
    }
  });

/**
 * Cancel a DRAFT stock transfer.
 */
export const cancelStockTransfer = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    try {
      const transfer = await prisma.stockTransfer.findFirst({
        where: { id: input.id, businessId: input.businessId },
      });

      if (!transfer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Stock transfer not found',
        });
      }

      if (transfer.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only DRAFT transfers can be cancelled',
        });
      }

      return prisma.stockTransfer.update({
        where: { id: input.id },
        data: { status: 'CANCELLED' },
      });
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'cancel stock transfer',
        userId: ctx.userId,
      });
    }
  });

// =====================================================
// DAMAGE REPORT CONTROLLERS
// =====================================================

/**
 * Create a Damage Report (DRAFT).
 */
export const createDamageReport = businessMemberProcedure
  .input(damageReportSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const itemsData = input.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalLoss: item.quantity * item.unitCost,
        damageType: item.damageType as 'DAMAGED' | 'EXPIRED' | 'LOST' | 'OTHER',
        shelfId: item.shelfId,
        batchId: item.batchId,
      }));

      const report = await withDocumentNumber(
        input.businessId,
        DOC_PREFIXES.DAMAGE_REPORT,
        input.documentNumber,
        (documentNumber) =>
          prisma.damageReport.create({
            data: {
              documentNumber,
              reportDate: input.reportDate ?? new Date(),
              reason: input.reason,
              notes: input.notes,
              warehouseId: input.warehouseId,
              businessId: input.businessId,
              items: { create: itemsData },
            },
            include: {
              items: {
                include: {
                  product: { select: { id: true, name: true, sku: true } },
                },
              },
              warehouse: { select: { id: true, name: true } },
            },
          }),
      );

      return report;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'create damage report',
        userId: ctx.userId,
      });
    }
  });

/**
 * List damage reports.
 */
export const getDamageReports = businessMemberProcedure
  .input(
    z.object({
      businessId: z.string(),
      status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']).optional(),
      warehouseId: z.string().optional(),
      search: z.string().optional(),
      pageSize: z.number().int().min(1).max(100).default(20),
      pageNumber: z.number().int().min(1).default(1),
    }),
  )
  .query(async ({ input, ctx }) => {
    try {
      const where: any = { businessId: input.businessId };

      if (input.status) where.status = input.status;
      if (input.warehouseId) where.warehouseId = input.warehouseId;
      if (input.search) {
        where.documentNumber = { contains: input.search, mode: 'insensitive' };
      }

      const [data, total] = await prisma.$transaction([
        prisma.damageReport.findMany({
          where,
          include: {
            warehouse: { select: { id: true, name: true } },
            _count: { select: { items: true } },
          },
          orderBy: [{ reportDate: 'desc' }, { id: 'asc' }],
          skip: (input.pageNumber - 1) * input.pageSize,
          take: input.pageSize,
        }),
        prisma.damageReport.count({ where }),
      ]);

      return {
        data,
        pagination: {
          total,
          pageSize: input.pageSize,
          pageNumber: input.pageNumber,
          totalPages: Math.ceil(total / input.pageSize),
        },
      };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'fetch damage reports',
        userId: ctx.userId,
      });
    }
  });

/**
 * Get a single damage report.
 */
export const getDamageReportById = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .query(async ({ input, ctx }) => {
    try {
      const report = await prisma.damageReport.findFirst({
        where: { id: input.id, businessId: input.businessId },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true, unit: true },
              },
              shelf: { select: { id: true, shelfCode: true } },
              batch: { select: { id: true, batchNumber: true } },
            },
          },
          warehouse: { select: { id: true, name: true } },
        },
      });

      if (!report) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Damage report not found',
        });
      }

      return report;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'fetch damage report',
        userId: ctx.userId,
      });
    }
  });

/**
 * Confirm a damage report.
 *
 * Creates DAMAGE_OUT or EXPIRED_OUT ledger entries based on item damageType.
 */
export const confirmDamageReport = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    try {
      const report = await prisma.damageReport.findFirst({
        where: { id: input.id, businessId: input.businessId },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (!report) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Damage report not found',
        });
      }

      if (report.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot confirm a damage report with status "${report.status}"`,
        });
      }

      const confirmed = await prisma.$transaction(async (tx) => {
        await lockProductsForUpdate(
          tx,
          report.items.map((item) => item.productId),
        );

        let writtenOff = new Prisma.Decimal(0);

        for (const item of report.items) {
          // Validate stock availability
          await validateStockAvailability(tx, {
            productId: item.productId,
            warehouseId: report.warehouseId,
            shelfId: item.shelfId,
            batchId: item.batchId,
            requiredQuantity: item.quantity,
            productName: item.product.name,
          });

          // Use EXPIRED_OUT for expired items, DAMAGE_OUT for everything else
          const txnType =
            item.damageType === 'EXPIRED' ? 'EXPIRED_OUT' : 'DAMAGE_OUT';

          // Written off at the value it was carried at — the loss is what the
          // stock actually cost, not a figure entered on the report.
          const unitCost = await resolveOutboundCost(tx, {
            productId: item.productId,
            warehouseId: report.warehouseId,
            shelfId: item.shelfId,
            batchId: item.batchId,
          });

          writtenOff = writtenOff.plus(
            new Prisma.Decimal(item.quantity.toString()).mul(unitCost),
          );

          await createLedgerEntry(tx, {
            transactionType: txnType,
            productId: item.productId,
            warehouseId: report.warehouseId,
            shelfId: item.shelfId,
            batchId: item.batchId,
            businessId: input.businessId,
            quantity: item.quantity,
            unitCost,
            referenceTable: 'damage_reports',
            referenceId: report.id,
            transactionDate: report.reportDate,
            notes: `Damage ${report.documentNumber} (${item.damageType}) - ${item.product.name}`,
          });

          // If the item is linked to a batch and is EXPIRED, mark batch as expired
          if (item.damageType === 'EXPIRED' && item.batchId) {
            await tx.productBatch.update({
              where: { id: item.batchId },
              data: { isExpired: true },
            });
          }
        }

        // Damage and expiry are real losses: the stock is gone, so Inventory
        // is relieved and the cost is expensed.
        await postJournalEntry(tx, {
          businessId: input.businessId,
          source: 'DAMAGE_REPORT',
          sourceId: report.id,
          date: report.reportDate,
          narration: `Damage Report ${report.documentNumber}`,
          postedBy: ctx.userId,
          lines: stockWriteOffPosting({ amount: writtenOff.toFixed(2) }),
        });

        return tx.damageReport.update({
          where: { id: input.id },
          data: { status: 'CONFIRMED' },
          include: {
            items: {
              include: {
                product: { select: { id: true, name: true, sku: true } },
              },
            },
            warehouse: { select: { id: true, name: true } },
          },
        });
      });

      return confirmed;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'confirm damage report',
        userId: ctx.userId,
      });
    }
  });

/**
 * Cancel a DRAFT damage report.
 */
export const cancelDamageReport = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    try {
      const report = await prisma.damageReport.findFirst({
        where: { id: input.id, businessId: input.businessId },
      });

      if (!report) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Damage report not found',
        });
      }

      if (report.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only DRAFT damage reports can be cancelled',
        });
      }

      return prisma.damageReport.update({
        where: { id: input.id },
        data: { status: 'CANCELLED' },
      });
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'cancel damage report',
        userId: ctx.userId,
      });
    }
  });
