import { prisma } from '@seed/database';
import { businessMemberProcedure } from '../trpc/procedures';
import * as z from 'zod';
import { TRPCError } from '@trpc/server';
import {
  purchaseOrderSchema,
  purchaseOrderUpdateSchema,
  grnSchema,
} from '@seed/schemas';
import { handleControllerError } from '../helpers/controllerErrorHandler';
import {
  generateDocumentNumber,
  DOC_PREFIXES,
} from '../helpers/documentNumber';
import { createLedgerEntry } from '../helpers/inventoryLedger';

// =====================================================
// PURCHASE ORDER CONTROLLERS
// =====================================================

/**
 * Helper: compute line-item total from quantity, unitPrice, taxRate, discount.
 */
function computeItemTotal(
  quantity: number,
  unitPrice: number,
  taxRate: number,
  discount: number,
) {
  const subtotal = quantity * unitPrice;
  const discountAmt = subtotal * (discount / 100);
  const afterDiscount = subtotal - discountAmt;
  const taxAmt = afterDiscount * (taxRate / 100);
  return {
    totalPrice: afterDiscount + taxAmt,
    taxAmt,
    discountAmt,
  };
}

/**
 * Create a new Purchase Order (DRAFT).
 */
export const createPurchaseOrder = businessMemberProcedure
  .input(purchaseOrderSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const documentNumber = await generateDocumentNumber(
        input.businessId,
        DOC_PREFIXES.PURCHASE_ORDER,
        input.documentNumber,
      );

      let totalAmount = 0;
      let taxAmount = 0;
      let discountAmount = 0;

      const itemsData = input.items.map((item) => {
        const computed = computeItemTotal(
          item.quantity,
          item.unitPrice,
          item.taxRate ?? 0,
          item.discount ?? 0,
        );
        totalAmount += item.quantity * item.unitPrice;
        taxAmount += computed.taxAmt;
        discountAmount += computed.discountAmt;

        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate ?? 0,
          discount: item.discount ?? 0,
          totalPrice: computed.totalPrice,
        };
      });

      const grandTotal = totalAmount - discountAmount + taxAmount;

      const po = await prisma.purchaseOrder.create({
        data: {
          documentNumber,
          orderDate: input.orderDate ?? new Date(),
          expectedDate: input.expectedDate,
          notes: input.notes,
          totalAmount,
          taxAmount,
          discountAmount,
          grandTotal,
          supplierId: input.supplierId,
          businessId: input.businessId,
          items: {
            create: itemsData,
          },
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
          supplier: { select: { id: true, name: true } },
        },
      });

      return po;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'create purchase order',
        userId: ctx.userId,
        fallbackMessage:
          'Could not create purchase order. Document number may be in use.',
      });
    }
  });

/**
 * List purchase orders for a business with filters and pagination.
 */
export const getPurchaseOrders = businessMemberProcedure
  .input(
    z.object({
      businessId: z.string(),
      status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']).optional(),
      supplierId: z.string().optional(),
      search: z.string().optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      pageSize: z.number().int().min(1).max(100).default(20),
      pageNumber: z.number().int().min(1).default(1),
    }),
  )
  .query(async ({ input, ctx }) => {
    try {
      const where: any = { businessId: input.businessId };

      if (input.status) where.status = input.status;
      if (input.supplierId) where.supplierId = input.supplierId;
      if (input.search) {
        where.OR = [
          { documentNumber: { contains: input.search, mode: 'insensitive' } },
          {
            supplier: { name: { contains: input.search, mode: 'insensitive' } },
          },
        ];
      }
      if (input.startDate || input.endDate) {
        where.orderDate = {};
        if (input.startDate) where.orderDate.gte = input.startDate;
        if (input.endDate) where.orderDate.lte = input.endDate;
      }

      const [data, total] = await prisma.$transaction([
        prisma.purchaseOrder.findMany({
          where,
          include: {
            supplier: { select: { id: true, name: true } },
            _count: { select: { items: true, goodsReceiptNotes: true } },
          },
          orderBy: [{ orderDate: 'desc' }, { id: 'asc' }],
          skip: (input.pageNumber - 1) * input.pageSize,
          take: input.pageSize,
        }),
        prisma.purchaseOrder.count({ where }),
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
        operation: 'fetch purchase orders',
        userId: ctx.userId,
      });
    }
  });

/**
 * Get a single purchase order with full details.
 */
export const getPurchaseOrderById = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .query(async ({ input, ctx }) => {
    try {
      const po = await prisma.purchaseOrder.findFirst({
        where: { id: input.id, businessId: input.businessId },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true, unit: true },
              },
            },
          },
          supplier: {
            select: { id: true, name: true, email: true, phone: true },
          },
          goodsReceiptNotes: {
            select: {
              id: true,
              documentNumber: true,
              status: true,
              receivedDate: true,
            },
          },
        },
      });

      if (!po) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Purchase order not found',
        });
      }

      return po;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'fetch purchase order',
        userId: ctx.userId,
      });
    }
  });

/**
 * Update a DRAFT purchase order.
 */
export const updatePurchaseOrder = businessMemberProcedure
  .input(
    z.object({
      id: z.string(),
      businessId: z.string(),
      data: purchaseOrderUpdateSchema,
    }),
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const existing = await prisma.purchaseOrder.findFirst({
        where: { id: input.id, businessId: input.businessId },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Purchase order not found',
        });
      }

      if (existing.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only DRAFT purchase orders can be edited',
        });
      }

      const updateData: any = { ...input.data };

      // If items are being updated, recalculate totals
      if (input.data.items) {
        let totalAmount = 0;
        let taxAmount = 0;
        let discountAmount = 0;

        const itemsData = input.data.items.map((item) => {
          const computed = computeItemTotal(
            item.quantity,
            item.unitPrice,
            item.taxRate ?? 0,
            item.discount ?? 0,
          );
          totalAmount += item.quantity * item.unitPrice;
          taxAmount += computed.taxAmt;
          discountAmount += computed.discountAmt;

          return {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate ?? 0,
            discount: item.discount ?? 0,
            totalPrice: computed.totalPrice,
          };
        });

        updateData.totalAmount = totalAmount;
        updateData.taxAmount = taxAmount;
        updateData.discountAmount = discountAmount;
        updateData.grandTotal = totalAmount - discountAmount + taxAmount;

        // Delete old items and create new ones
        delete updateData.items;
        await prisma.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: input.id },
        });

        const po = await prisma.purchaseOrder.update({
          where: { id: input.id },
          data: {
            ...updateData,
            items: { create: itemsData },
          },
          include: {
            items: {
              include: {
                product: { select: { id: true, name: true, sku: true } },
              },
            },
            supplier: { select: { id: true, name: true } },
          },
        });

        return po;
      }

      const po = await prisma.purchaseOrder.update({
        where: { id: input.id },
        data: updateData,
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
          supplier: { select: { id: true, name: true } },
        },
      });

      return po;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'update purchase order',
        userId: ctx.userId,
      });
    }
  });

/**
 * Confirm a purchase order. Changes status from DRAFT to CONFIRMED.
 * PO confirmation doesn't create ledger entries — that happens at GRN.
 */
export const confirmPurchaseOrder = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    try {
      const po = await prisma.purchaseOrder.findFirst({
        where: { id: input.id, businessId: input.businessId },
      });

      if (!po) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Purchase order not found',
        });
      }

      if (po.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot confirm a purchase order with status "${po.status}"`,
        });
      }

      const confirmed = await prisma.purchaseOrder.update({
        where: { id: input.id },
        data: { status: 'CONFIRMED' },
      });

      return confirmed;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'confirm purchase order',
        userId: ctx.userId,
      });
    }
  });

/**
 * Cancel a purchase order. Only DRAFT orders can be cancelled.
 */
export const cancelPurchaseOrder = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    try {
      const po = await prisma.purchaseOrder.findFirst({
        where: { id: input.id, businessId: input.businessId },
      });

      if (!po) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Purchase order not found',
        });
      }

      if (po.status === 'CANCELLED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Purchase order is already cancelled',
        });
      }

      if (po.status === 'CONFIRMED') {
        // Check if any GRNs reference this PO
        const grnCount = await prisma.goodsReceiptNote.count({
          where: { purchaseOrderId: input.id, status: { not: 'CANCELLED' } },
        });
        if (grnCount > 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot cancel a confirmed PO that has active GRNs',
          });
        }
      }

      const cancelled = await prisma.purchaseOrder.update({
        where: { id: input.id },
        data: { status: 'CANCELLED' },
      });

      return cancelled;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'cancel purchase order',
        userId: ctx.userId,
      });
    }
  });

/**
 * Delete a DRAFT purchase order.
 */
export const deletePurchaseOrder = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    try {
      const po = await prisma.purchaseOrder.findFirst({
        where: { id: input.id, businessId: input.businessId },
      });

      if (!po) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Purchase order not found',
        });
      }

      if (po.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only DRAFT purchase orders can be deleted',
        });
      }

      await prisma.purchaseOrder.delete({ where: { id: input.id } });
      return { success: true };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'delete purchase order',
        userId: ctx.userId,
      });
    }
  });

// =====================================================
// GOODS RECEIPT NOTE (GRN) CONTROLLERS
// =====================================================

/**
 * Create a new GRN (DRAFT). Does not create inventory entries until confirmed.
 */
export const createGRN = businessMemberProcedure
  .input(grnSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const documentNumber = await generateDocumentNumber(
        input.businessId,
        DOC_PREFIXES.GRN,
        input.documentNumber,
      );

      const itemsData = input.items.map((item) => ({
        productId: item.productId,
        quantityOrdered: item.quantityOrdered,
        quantityReceived: item.quantityReceived,
        unitPrice: item.unitPrice,
        totalPrice: item.quantityReceived * item.unitPrice,
        shelfId: item.shelfId,
        batchId: item.batchId,
      }));

      const grn = await prisma.goodsReceiptNote.create({
        data: {
          documentNumber,
          receivedDate: input.receivedDate ?? new Date(),
          notes: input.notes,
          purchaseOrderId: input.purchaseOrderId,
          supplierId: input.supplierId,
          warehouseId: input.warehouseId,
          businessId: input.businessId,
          items: { create: itemsData },
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
              shelf: { select: { id: true, shelfCode: true } },
              batch: { select: { id: true, batchNumber: true } },
            },
          },
          supplier: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true } },
        },
      });

      return grn;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'create GRN',
        userId: ctx.userId,
        fallbackMessage: 'Could not create GRN. Document number may be in use.',
      });
    }
  });

/**
 * List GRNs for a business.
 */
export const getGRNs = businessMemberProcedure
  .input(
    z.object({
      businessId: z.string(),
      status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']).optional(),
      supplierId: z.string().optional(),
      warehouseId: z.string().optional(),
      purchaseOrderId: z.string().optional(),
      search: z.string().optional(),
      pageSize: z.number().int().min(1).max(100).default(20),
      pageNumber: z.number().int().min(1).default(1),
    }),
  )
  .query(async ({ input, ctx }) => {
    try {
      const where: any = { businessId: input.businessId };

      if (input.status) where.status = input.status;
      if (input.supplierId) where.supplierId = input.supplierId;
      if (input.warehouseId) where.warehouseId = input.warehouseId;
      if (input.purchaseOrderId) where.purchaseOrderId = input.purchaseOrderId;
      if (input.search) {
        where.documentNumber = { contains: input.search, mode: 'insensitive' };
      }

      const [data, total] = await prisma.$transaction([
        prisma.goodsReceiptNote.findMany({
          where,
          include: {
            supplier: { select: { id: true, name: true } },
            warehouse: { select: { id: true, name: true } },
            purchaseOrder: { select: { id: true, documentNumber: true } },
            _count: { select: { items: true } },
          },
          orderBy: [{ receivedDate: 'desc' }, { id: 'asc' }],
          skip: (input.pageNumber - 1) * input.pageSize,
          take: input.pageSize,
        }),
        prisma.goodsReceiptNote.count({ where }),
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
        operation: 'fetch GRNs',
        userId: ctx.userId,
      });
    }
  });

/**
 * Get a single GRN with full details.
 */
export const getGRNById = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .query(async ({ input, ctx }) => {
    try {
      const grn = await prisma.goodsReceiptNote.findFirst({
        where: { id: input.id, businessId: input.businessId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  unit: true,
                  trackBatch: true,
                },
              },
              shelf: { select: { id: true, shelfCode: true } },
              batch: {
                select: { id: true, batchNumber: true, expiryDate: true },
              },
            },
          },
          supplier: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true } },
          purchaseOrder: { select: { id: true, documentNumber: true } },
        },
      });

      if (!grn) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'GRN not found' });
      }

      return grn;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'fetch GRN',
        userId: ctx.userId,
      });
    }
  });

/**
 * Confirm a GRN — THIS IS THE KEY OPERATION.
 *
 * On confirmation:
 * 1. For each line item, if product.trackBatch && item.newBatch → create ProductBatch
 * 2. Create PURCHASE_IN ledger entries for each line item
 * 3. Stock summaries & product cache updated automatically by ledger engine
 */
export const confirmGRN = businessMemberProcedure
  .input(
    z.object({
      id: z.string(),
      businessId: z.string(),
      // Allow passing newBatch info at confirm time for items that need it
      batchOverrides: z
        .array(
          z.object({
            grnItemId: z.string(),
            newBatch: z
              .object({
                batchNumber: z.string().min(1),
                expiryDate: z.coerce.date().optional(),
                manufacturingDate: z.coerce.date().optional(),
              })
              .optional(),
          }),
        )
        .optional(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const grn = await prisma.goodsReceiptNote.findFirst({
        where: { id: input.id, businessId: input.businessId },
        include: {
          items: {
            include: {
              product: { select: { id: true, trackBatch: true, name: true } },
            },
          },
        },
      });

      if (!grn) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'GRN not found' });
      }

      if (grn.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot confirm a GRN with status "${grn.status}"`,
        });
      }

      // Build batch override map
      const batchOverrideMap = new Map(
        (input.batchOverrides ?? []).map((b) => [b.grnItemId, b.newBatch]),
      );

      // Execute everything in a single transaction
      const confirmed = await prisma.$transaction(async (tx) => {
        // Process each GRN item
        for (const item of grn.items) {
          let batchId = item.batchId;

          // If product tracks batches and a new batch is specified
          if (item.product.trackBatch && !batchId) {
            const batchOverride = batchOverrideMap.get(item.id);
            if (batchOverride) {
              const newBatch = await tx.productBatch.create({
                data: {
                  batchNumber: batchOverride.batchNumber,
                  expiryDate: batchOverride.expiryDate,
                  manufacturingDate: batchOverride.manufacturingDate,
                  purchasePrice: item.unitPrice,
                  productId: item.productId,
                },
              });
              batchId = newBatch.id;

              // Update the GRN item to link to the new batch
              await tx.gRNItem.update({
                where: { id: item.id },
                data: { batchId: newBatch.id },
              });
            }
          }

          // Create PURCHASE_IN ledger entry
          await createLedgerEntry(tx, {
            transactionType: 'PURCHASE_IN',
            productId: item.productId,
            warehouseId: grn.warehouseId,
            shelfId: item.shelfId,
            batchId,
            businessId: input.businessId,
            quantity: item.quantityReceived,
            unitCost: item.unitPrice,
            referenceTable: 'goods_receipt_notes',
            referenceId: grn.id,
            transactionDate: grn.receivedDate,
            notes: `GRN ${grn.documentNumber} - ${item.product.name}`,
          });
        }

        // Update GRN status
        return tx.goodsReceiptNote.update({
          where: { id: input.id },
          data: { status: 'CONFIRMED' },
          include: {
            items: {
              include: {
                product: { select: { id: true, name: true, sku: true } },
                batch: { select: { id: true, batchNumber: true } },
              },
            },
            supplier: { select: { id: true, name: true } },
            warehouse: { select: { id: true, name: true } },
          },
        });
      });

      return confirmed;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'confirm GRN',
        userId: ctx.userId,
      });
    }
  });

/**
 * Cancel a GRN. Only DRAFT GRNs can be cancelled.
 */
export const cancelGRN = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    try {
      const grn = await prisma.goodsReceiptNote.findFirst({
        where: { id: input.id, businessId: input.businessId },
      });

      if (!grn) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'GRN not found' });
      }

      if (grn.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only DRAFT GRNs can be cancelled',
        });
      }

      const cancelled = await prisma.goodsReceiptNote.update({
        where: { id: input.id },
        data: { status: 'CANCELLED' },
      });

      return cancelled;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'cancel GRN',
        userId: ctx.userId,
      });
    }
  });

/**
 * Delete a DRAFT GRN.
 */
export const deleteGRN = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    try {
      const grn = await prisma.goodsReceiptNote.findFirst({
        where: { id: input.id, businessId: input.businessId },
      });

      if (!grn) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'GRN not found' });
      }

      if (grn.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only DRAFT GRNs can be deleted',
        });
      }

      await prisma.goodsReceiptNote.delete({ where: { id: input.id } });
      return { success: true };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'delete GRN',
        userId: ctx.userId,
      });
    }
  });
