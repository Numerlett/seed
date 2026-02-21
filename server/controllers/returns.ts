import { prisma } from '@seed/database';
import { businessMemberProcedure } from '../trpc/procedures';
import * as z from 'zod';
import { TRPCError } from '@trpc/server';
import { purchaseReturnSchema, salesReturnSchema } from '@seed/schemas';
import { handleControllerError } from '../helpers/controllerErrorHandler';
import {
  generateDocumentNumber,
  DOC_PREFIXES,
} from '../helpers/documentNumber';
import {
  createLedgerEntry,
  validateStockAvailability,
} from '../helpers/inventoryLedger';

// =====================================================
// PURCHASE RETURN CONTROLLERS
// =====================================================

/**
 * Create a Purchase Return (DRAFT).
 * Stock is not affected until confirmed.
 */
export const createPurchaseReturn = businessMemberProcedure
  .input(purchaseReturnSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const documentNumber = await generateDocumentNumber(
        input.businessId,
        DOC_PREFIXES.PURCHASE_RETURN,
        input.documentNumber,
      );

      const itemsData = input.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
        shelfId: item.shelfId,
        batchId: item.batchId,
      }));

      const totalAmount = itemsData.reduce((sum, i) => sum + i.totalPrice, 0);

      const pr = await prisma.purchaseReturn.create({
        data: {
          documentNumber,
          returnDate: input.returnDate ?? new Date(),
          reason: input.reason,
          notes: input.notes,
          totalAmount,
          supplierId: input.supplierId,
          grnId: input.grnId,
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
          supplier: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true } },
        },
      });

      return pr;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'create purchase return',
        userId: ctx.userId,
      });
    }
  });

/**
 * List purchase returns.
 */
export const getPurchaseReturns = businessMemberProcedure
  .input(
    z.object({
      businessId: z.string(),
      status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']).optional(),
      supplierId: z.string().optional(),
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
      if (input.search) {
        where.documentNumber = { contains: input.search, mode: 'insensitive' };
      }

      const [data, total] = await prisma.$transaction([
        prisma.purchaseReturn.findMany({
          where,
          include: {
            supplier: { select: { id: true, name: true } },
            warehouse: { select: { id: true, name: true } },
            grn: { select: { id: true, documentNumber: true } },
            _count: { select: { items: true } },
          },
          orderBy: [{ returnDate: 'desc' }, { id: 'asc' }],
          skip: (input.pageNumber - 1) * input.pageSize,
          take: input.pageSize,
        }),
        prisma.purchaseReturn.count({ where }),
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
        operation: 'fetch purchase returns',
        userId: ctx.userId,
      });
    }
  });

/**
 * Get a single purchase return.
 */
export const getPurchaseReturnById = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .query(async ({ input, ctx }) => {
    try {
      const pr = await prisma.purchaseReturn.findFirst({
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
          supplier: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true } },
          grn: { select: { id: true, documentNumber: true } },
        },
      });

      if (!pr) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Purchase return not found',
        });
      }

      return pr;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'fetch purchase return',
        userId: ctx.userId,
      });
    }
  });

/**
 * Confirm a purchase return.
 *
 * Triggers PURCHASE_RETURN_OUT ledger entries — stock goes OUT (returning to supplier).
 * Validates stock availability before deducting.
 */
export const confirmPurchaseReturn = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    try {
      const pr = await prisma.purchaseReturn.findFirst({
        where: { id: input.id, businessId: input.businessId },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (!pr) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Purchase return not found',
        });
      }

      if (pr.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot confirm a purchase return with status "${pr.status}"`,
        });
      }

      const confirmed = await prisma.$transaction(async (tx) => {
        for (const item of pr.items) {
          // Validate stock availability
          await validateStockAvailability(tx, {
            productId: item.productId,
            warehouseId: pr.warehouseId,
            shelfId: item.shelfId,
            batchId: item.batchId,
            requiredQuantity: item.quantity,
            productName: item.product.name,
          });

          await createLedgerEntry(tx, {
            transactionType: 'PURCHASE_RETURN_OUT',
            productId: item.productId,
            warehouseId: pr.warehouseId,
            shelfId: item.shelfId,
            batchId: item.batchId,
            businessId: input.businessId,
            quantity: item.quantity,
            unitCost: item.unitPrice,
            referenceTable: 'purchase_returns',
            referenceId: pr.id,
            transactionDate: pr.returnDate,
            notes: `Purchase Return ${pr.documentNumber} - ${item.product.name}`,
          });
        }

        return tx.purchaseReturn.update({
          where: { id: input.id },
          data: { status: 'CONFIRMED' },
          include: {
            items: {
              include: {
                product: { select: { id: true, name: true, sku: true } },
              },
            },
            supplier: { select: { id: true, name: true } },
          },
        });
      });

      return confirmed;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'confirm purchase return',
        userId: ctx.userId,
      });
    }
  });

/**
 * Cancel a DRAFT purchase return.
 */
export const cancelPurchaseReturn = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    try {
      const pr = await prisma.purchaseReturn.findFirst({
        where: { id: input.id, businessId: input.businessId },
      });

      if (!pr) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Purchase return not found',
        });
      }

      if (pr.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only DRAFT purchase returns can be cancelled',
        });
      }

      return prisma.purchaseReturn.update({
        where: { id: input.id },
        data: { status: 'CANCELLED' },
      });
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'cancel purchase return',
        userId: ctx.userId,
      });
    }
  });

// =====================================================
// SALES RETURN CONTROLLERS
// =====================================================

/**
 * Create a Sales Return (DRAFT).
 * Stock is not affected until confirmed.
 */
export const createSalesReturn = businessMemberProcedure
  .input(salesReturnSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const documentNumber = await generateDocumentNumber(
        input.businessId,
        DOC_PREFIXES.SALES_RETURN,
        input.documentNumber,
      );

      const itemsData = input.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
        shelfId: item.shelfId,
        batchId: item.batchId,
      }));

      const totalAmount = itemsData.reduce((sum, i) => sum + i.totalPrice, 0);

      const sr = await prisma.salesReturn.create({
        data: {
          documentNumber,
          returnDate: input.returnDate ?? new Date(),
          reason: input.reason,
          notes: input.notes,
          totalAmount,
          customerId: input.customerId,
          saleInvoiceId: input.saleInvoiceId,
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
          customer: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true } },
        },
      });

      return sr;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'create sales return',
        userId: ctx.userId,
      });
    }
  });

/**
 * List sales returns.
 */
export const getSalesReturns = businessMemberProcedure
  .input(
    z.object({
      businessId: z.string(),
      status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']).optional(),
      customerId: z.string().optional(),
      search: z.string().optional(),
      pageSize: z.number().int().min(1).max(100).default(20),
      pageNumber: z.number().int().min(1).default(1),
    }),
  )
  .query(async ({ input, ctx }) => {
    try {
      const where: any = { businessId: input.businessId };

      if (input.status) where.status = input.status;
      if (input.customerId) where.customerId = input.customerId;
      if (input.search) {
        where.documentNumber = { contains: input.search, mode: 'insensitive' };
      }

      const [data, total] = await prisma.$transaction([
        prisma.salesReturn.findMany({
          where,
          include: {
            customer: { select: { id: true, name: true } },
            warehouse: { select: { id: true, name: true } },
            saleInvoice: { select: { id: true, documentNumber: true } },
            _count: { select: { items: true } },
          },
          orderBy: [{ returnDate: 'desc' }, { id: 'asc' }],
          skip: (input.pageNumber - 1) * input.pageSize,
          take: input.pageSize,
        }),
        prisma.salesReturn.count({ where }),
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
        operation: 'fetch sales returns',
        userId: ctx.userId,
      });
    }
  });

/**
 * Get a single sales return.
 */
export const getSalesReturnById = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .query(async ({ input, ctx }) => {
    try {
      const sr = await prisma.salesReturn.findFirst({
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
          customer: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true } },
          saleInvoice: { select: { id: true, documentNumber: true } },
        },
      });

      if (!sr) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Sales return not found',
        });
      }

      return sr;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'fetch sales return',
        userId: ctx.userId,
      });
    }
  });

/**
 * Confirm a sales return.
 *
 * Triggers SALES_RETURN_IN ledger entries — stock comes back IN.
 */
export const confirmSalesReturn = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    try {
      const sr = await prisma.salesReturn.findFirst({
        where: { id: input.id, businessId: input.businessId },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, costPrice: true } },
            },
          },
        },
      });

      if (!sr) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Sales return not found',
        });
      }

      if (sr.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot confirm a sales return with status "${sr.status}"`,
        });
      }

      const confirmed = await prisma.$transaction(async (tx) => {
        for (const item of sr.items) {
          // SALES_RETURN_IN increases stock
          await createLedgerEntry(tx, {
            transactionType: 'SALES_RETURN_IN',
            productId: item.productId,
            warehouseId: sr.warehouseId,
            shelfId: item.shelfId,
            batchId: item.batchId,
            businessId: input.businessId,
            quantity: item.quantity,
            unitCost: item.product.costPrice, // Use product's cost price for valuation
            referenceTable: 'sales_returns',
            referenceId: sr.id,
            transactionDate: sr.returnDate,
            notes: `Sales Return ${sr.documentNumber} - ${item.product.name}`,
          });
        }

        return tx.salesReturn.update({
          where: { id: input.id },
          data: { status: 'CONFIRMED' },
          include: {
            items: {
              include: {
                product: { select: { id: true, name: true, sku: true } },
              },
            },
            customer: { select: { id: true, name: true } },
          },
        });
      });

      return confirmed;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'confirm sales return',
        userId: ctx.userId,
      });
    }
  });

/**
 * Cancel a DRAFT sales return.
 */
export const cancelSalesReturn = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    try {
      const sr = await prisma.salesReturn.findFirst({
        where: { id: input.id, businessId: input.businessId },
      });

      if (!sr) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Sales return not found',
        });
      }

      if (sr.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only DRAFT sales returns can be cancelled',
        });
      }

      return prisma.salesReturn.update({
        where: { id: input.id },
        data: { status: 'CANCELLED' },
      });
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'cancel sales return',
        userId: ctx.userId,
      });
    }
  });
