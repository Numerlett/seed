import { prisma } from '@seed/database';
import { businessMemberProcedure } from '../trpc/procedures';
import * as z from 'zod';
import { TRPCError } from '@trpc/server';
import { productBatchSchema, productBatchUpdateSchema } from '@seed/schemas';
import { handleControllerError } from '../helpers/controllerErrorHandler';

// =====================================================
// PRODUCT BATCH CONTROLLERS
// =====================================================

/**
 * Create a new product batch.
 * Validates that the product belongs to the business and has batch tracking enabled.
 */
export const createBatch = businessMemberProcedure
  .input(productBatchSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      // Verify product belongs to business and has batch tracking enabled
      const product = await prisma.product.findFirst({
        where: { id: input.productId, businessId: input.businessId },
        select: { id: true, trackBatch: true, name: true },
      });

      if (!product) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        });
      }

      if (!product.trackBatch) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Batch tracking is not enabled for product "${product.name}". Enable it in product settings first.`,
        });
      }

      const batch = await prisma.productBatch.create({
        data: {
          batchNumber: input.batchNumber,
          expiryDate: input.expiryDate,
          manufacturingDate: input.manufacturingDate,
          purchasePrice: input.purchasePrice,
          productId: input.productId,
        },
        include: {
          product: { select: { id: true, name: true, sku: true } },
        },
      });

      return batch;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'create batch',
        userId: ctx.userId,
        fallbackMessage: 'This batch number may already exist for this product',
      });
    }
  });

/**
 * List batches for a specific product with optional filters.
 */
export const getBatchesByProduct = businessMemberProcedure
  .input(
    z.object({
      productId: z.string(),
      businessId: z.string(),
      includeExpired: z.boolean().default(false),
      search: z.string().optional(),
    }),
  )
  .query(async ({ input, ctx }) => {
    try {
      // Verify product belongs to business
      const product = await prisma.product.findFirst({
        where: { id: input.productId, businessId: input.businessId },
        select: { id: true },
      });

      if (!product) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        });
      }

      const where: any = { productId: input.productId };

      if (!input.includeExpired) {
        where.isExpired = false;
      }

      if (input.search) {
        where.batchNumber = { contains: input.search, mode: 'insensitive' };
      }

      const batches = await prisma.productBatch.findMany({
        where,
        include: {
          _count: {
            select: { stockSummaries: true },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      });

      return batches;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'fetch batches',
        userId: ctx.userId,
      });
    }
  });

/**
 * Get a single batch by ID with stock summary.
 */
export const getBatchById = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .query(async ({ input, ctx }) => {
    try {
      const batch = await prisma.productBatch.findUnique({
        where: { id: input.id },
        include: {
          product: {
            select: { id: true, name: true, sku: true, businessId: true },
          },
          stockSummaries: {
            include: {
              warehouse: { select: { id: true, name: true } },
              shelf: { select: { id: true, shelfCode: true } },
            },
          },
        },
      });

      if (!batch || batch.product.businessId !== input.businessId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Batch not found',
        });
      }

      return batch;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'fetch batch',
        userId: ctx.userId,
      });
    }
  });

/**
 * Update a batch's metadata.
 */
export const updateBatch = businessMemberProcedure
  .input(
    z.object({
      id: z.string(),
      businessId: z.string(),
      data: productBatchUpdateSchema,
    }),
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const batch = await prisma.productBatch.findUnique({
        where: { id: input.id },
        include: {
          product: { select: { businessId: true } },
        },
      });

      if (!batch || batch.product.businessId !== input.businessId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Batch not found',
        });
      }

      const updated = await prisma.productBatch.update({
        where: { id: input.id },
        data: input.data,
      });

      return updated;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'update batch',
        userId: ctx.userId,
      });
    }
  });

/**
 * Mark a batch as expired. This is a soft flag — stock is NOT automatically written off.
 * Use a Damage Report with type EXPIRED to write off expired stock.
 */
export const markBatchExpired = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    try {
      const batch = await prisma.productBatch.findUnique({
        where: { id: input.id },
        include: {
          product: { select: { businessId: true } },
        },
      });

      if (!batch || batch.product.businessId !== input.businessId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Batch not found',
        });
      }

      if (batch.isExpired) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Batch is already marked as expired',
        });
      }

      const updated = await prisma.productBatch.update({
        where: { id: input.id },
        data: { isExpired: true },
      });

      return updated;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'mark batch expired',
        userId: ctx.userId,
      });
    }
  });

/**
 * Get batches expiring within a given number of days for a business.
 * Used for expiry alerts dashboard.
 */
export const getExpiringBatches = businessMemberProcedure
  .input(
    z.object({
      businessId: z.string(),
      daysAhead: z.number().int().positive().default(30),
      pageSize: z.number().int().min(1).max(100).default(20),
      pageNumber: z.number().int().min(1).default(1),
    }),
  )
  .query(async ({ input, ctx }) => {
    try {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + input.daysAhead);

      const where = {
        product: { businessId: input.businessId },
        isExpired: false,
        expiryDate: {
          not: null as any,
          lte: futureDate,
          gte: now,
        },
      };

      const [batches, total] = await prisma.$transaction([
        prisma.productBatch.findMany({
          where,
          include: {
            product: { select: { id: true, name: true, sku: true } },
            stockSummaries: {
              where: { currentQuantity: { gt: 0 } },
              select: {
                currentQuantity: true,
                warehouse: { select: { name: true } },
              },
            },
          },
          orderBy: [{ expiryDate: 'asc' }, { id: 'asc' }],
          skip: (input.pageNumber - 1) * input.pageSize,
          take: input.pageSize,
        }),
        prisma.productBatch.count({ where }),
      ]);

      return {
        data: batches,
        pagination: {
          total,
          pageSize: input.pageSize,
          pageNumber: input.pageNumber,
          totalPages: Math.ceil(total / input.pageSize),
        },
      };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'fetch expiring batches',
        userId: ctx.userId,
      });
    }
  });

/**
 * Delete a batch. Only allowed if no stock is held against it.
 */
export const deleteBatch = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    try {
      const batch = await prisma.productBatch.findUnique({
        where: { id: input.id },
        include: {
          product: { select: { businessId: true } },
          _count: { select: { stockSummaries: true, ledgerEntries: true } },
        },
      });

      if (!batch || batch.product.businessId !== input.businessId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Batch not found',
        });
      }

      if (batch._count.stockSummaries > 0 || batch._count.ledgerEntries > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'Cannot delete a batch that has stock records or ledger entries',
        });
      }

      await prisma.productBatch.delete({ where: { id: input.id } });
      return { success: true };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'delete batch',
        userId: ctx.userId,
      });
    }
  });
