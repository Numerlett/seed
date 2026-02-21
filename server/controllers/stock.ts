import { prisma } from '@seed/database';
import { businessMemberProcedure } from '../trpc/procedures';
import * as z from 'zod';
import { handleControllerError } from '../helpers/controllerErrorHandler';

// =====================================================
// STOCK SUMMARY & ALERTS CONTROLLERS
// =====================================================

/**
 * Get stock summary with filters.
 * Groups stock by product/warehouse/shelf/batch.
 */
export const getStockSummary = businessMemberProcedure
  .input(
    z.object({
      businessId: z.string(),
      warehouseId: z.string().optional(),
      productId: z.string().optional(),
      shelfId: z.string().optional(),
      batchId: z.string().optional(),
      hideZeroStock: z.boolean().default(true),
      pageSize: z.number().int().min(1).max(100).default(20),
      pageNumber: z.number().int().min(1).default(1),
    }),
  )
  .query(async ({ input, ctx }) => {
    try {
      const where: any = {
        product: { businessId: input.businessId },
      };

      if (input.warehouseId) where.warehouseId = input.warehouseId;
      if (input.productId) where.productId = input.productId;
      if (input.shelfId) where.shelfId = input.shelfId;
      if (input.batchId) where.batchId = input.batchId;
      if (input.hideZeroStock) {
        where.currentQuantity = { not: 0 };
      }

      const [data, total] = await prisma.$transaction([
        prisma.inventoryStock.findMany({
          where,
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                unit: true,
                costPrice: true,
                sellingPrice: true,
              },
            },
            warehouse: { select: { id: true, name: true } },
            shelf: { select: { id: true, shelfCode: true } },
            batch: {
              select: {
                id: true,
                batchNumber: true,
                expiryDate: true,
                isExpired: true,
              },
            },
          },
          orderBy: [
            { product: { name: 'asc' } },
            { warehouse: { name: 'asc' } },
            { id: 'asc' },
          ],
          skip: (input.pageNumber - 1) * input.pageSize,
          take: input.pageSize,
        }),
        prisma.inventoryStock.count({ where }),
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
        operation: 'fetch stock summary',
        userId: ctx.userId,
      });
    }
  });

/**
 * Get aggregated stock by product (across all warehouses).
 */
export const getStockByProduct = businessMemberProcedure
  .input(
    z.object({
      businessId: z.string(),
      productId: z.string(),
    }),
  )
  .query(async ({ input, ctx }) => {
    try {
      // Get product details
      const product = await prisma.product.findFirst({
        where: { id: input.productId, businessId: input.businessId },
        select: {
          id: true,
          name: true,
          sku: true,
          unit: true,
          currentStockLevel: true,
          minStockLevel: true,
          maxStockLevel: true,
          reorderLevel: true,
          costPrice: true,
          sellingPrice: true,
          trackBatch: true,
          trackExpiry: true,
        },
      });

      if (!product) {
        throw new Error('Product not found');
      }

      // Get stock breakdown by warehouse
      const stockByWarehouse = await prisma.inventoryStock.findMany({
        where: {
          productId: input.productId,
          currentQuantity: { not: 0 },
        },
        include: {
          warehouse: { select: { id: true, name: true } },
          shelf: { select: { id: true, shelfCode: true } },
          batch: {
            select: {
              id: true,
              batchNumber: true,
              expiryDate: true,
              isExpired: true,
            },
          },
        },
        orderBy: [{ warehouse: { name: 'asc' } }, { id: 'asc' }],
      });

      return { product, stockByWarehouse };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'fetch product stock',
        userId: ctx.userId,
      });
    }
  });

/**
 * Get aggregated stock for a warehouse (across all products).
 */
export const getStockByWarehouse = businessMemberProcedure
  .input(
    z.object({
      businessId: z.string(),
      warehouseId: z.string(),
      hideZeroStock: z.boolean().default(true),
      search: z.string().optional(),
      pageSize: z.number().int().min(1).max(100).default(20),
      pageNumber: z.number().int().min(1).default(1),
    }),
  )
  .query(async ({ input, ctx }) => {
    try {
      const where: any = {
        warehouseId: input.warehouseId,
        product: { businessId: input.businessId },
      };

      if (input.hideZeroStock) {
        where.currentQuantity = { not: 0 };
      }

      if (input.search) {
        where.product.OR = [
          { name: { contains: input.search, mode: 'insensitive' } },
          { sku: { contains: input.search, mode: 'insensitive' } },
        ];
      }

      const [data, total] = await prisma.$transaction([
        prisma.inventoryStock.findMany({
          where,
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                unit: true,
                costPrice: true,
                sellingPrice: true,
              },
            },
            shelf: { select: { id: true, shelfCode: true } },
            batch: {
              select: {
                id: true,
                batchNumber: true,
                expiryDate: true,
                isExpired: true,
              },
            },
          },
          orderBy: [{ product: { name: 'asc' } }, { id: 'asc' }],
          skip: (input.pageNumber - 1) * input.pageSize,
          take: input.pageSize,
        }),
        prisma.inventoryStock.count({ where }),
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
        operation: 'fetch warehouse stock',
        userId: ctx.userId,
      });
    }
  });

/**
 * Get products that are at or below their reorder level.
 */
export const getLowStockAlerts = businessMemberProcedure
  .input(
    z.object({
      businessId: z.string(),
      pageSize: z.number().int().min(1).max(100).default(20),
      pageNumber: z.number().int().min(1).default(1),
    }),
  )
  .query(async ({ input, ctx }) => {
    try {
      // Products where currentStockLevel <= reorderLevel
      const where = {
        businessId: input.businessId,
        isActive: true,
        reorderLevel: { not: null as any },
        currentStockLevel: { lte: prisma.product.fields.reorderLevel as any },
      };

      // Use raw query for the comparison between two columns
      const [products, total] = await prisma.$transaction([
        prisma.$queryRawUnsafe<any[]>(
          `SELECT p.id, p.name, p.sku, p.unit, p."currentStockLevel",
                  p."minStockLevel", p."reorderLevel", p."costPrice", p."sellingPrice"
           FROM products p
           WHERE p."businessId" = $1
             AND p."isActive" = true
             AND p."reorderLevel" IS NOT NULL
             AND p."currentStockLevel" <= p."reorderLevel"
           ORDER BY (p."currentStockLevel" / NULLIF(p."reorderLevel", 0)) ASC, p.id ASC
           LIMIT $2 OFFSET $3`,
          input.businessId,
          input.pageSize,
          (input.pageNumber - 1) * input.pageSize,
        ),
        prisma.$queryRawUnsafe<{ count: bigint }[]>(
          `SELECT COUNT(*)::bigint as count FROM products p
           WHERE p."businessId" = $1
             AND p."isActive" = true
             AND p."reorderLevel" IS NOT NULL
             AND p."currentStockLevel" <= p."reorderLevel"`,
          input.businessId,
        ),
      ]);

      const totalCount = Number(total[0]?.count ?? 0);

      return {
        data: products,
        pagination: {
          total: totalCount,
          pageSize: input.pageSize,
          pageNumber: input.pageNumber,
          totalPages: Math.ceil(totalCount / input.pageSize),
        },
      };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'fetch low stock alerts',
        userId: ctx.userId,
      });
    }
  });

/**
 * Get the ledger history for a specific product (audit trail).
 */
export const getProductLedger = businessMemberProcedure
  .input(
    z.object({
      businessId: z.string(),
      productId: z.string(),
      warehouseId: z.string().optional(),
      transactionType: z
        .enum([
          'PURCHASE_IN',
          'SALE_OUT',
          'SALES_RETURN_IN',
          'PURCHASE_RETURN_OUT',
          'ADJUSTMENT_IN',
          'ADJUSTMENT_OUT',
          'TRANSFER_IN',
          'TRANSFER_OUT',
          'DAMAGE_OUT',
          'EXPIRED_OUT',
        ])
        .optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      pageSize: z.number().int().min(1).max(100).default(50),
      pageNumber: z.number().int().min(1).default(1),
    }),
  )
  .query(async ({ input, ctx }) => {
    try {
      const where: any = {
        businessId: input.businessId,
        productId: input.productId,
      };

      if (input.warehouseId) where.warehouseId = input.warehouseId;
      if (input.transactionType) where.transactionType = input.transactionType;
      if (input.startDate || input.endDate) {
        where.transactionDate = {};
        if (input.startDate) where.transactionDate.gte = input.startDate;
        if (input.endDate) where.transactionDate.lte = input.endDate;
      }

      const [data, total] = await prisma.$transaction([
        prisma.inventoryLedger.findMany({
          where,
          include: {
            warehouse: { select: { id: true, name: true } },
            shelf: { select: { id: true, shelfCode: true } },
            batch: { select: { id: true, batchNumber: true } },
          },
          orderBy: [{ transactionDate: 'desc' }, { id: 'asc' }],
          skip: (input.pageNumber - 1) * input.pageSize,
          take: input.pageSize,
        }),
        prisma.inventoryLedger.count({ where }),
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
        operation: 'fetch product ledger',
        userId: ctx.userId,
      });
    }
  });

/**
 * Get inventory valuation report for a business.
 * Sums currentValue across all stock positions, grouped by product.
 */
export const getInventoryValuation = businessMemberProcedure
  .input(
    z.object({
      businessId: z.string(),
      warehouseId: z.string().optional(),
    }),
  )
  .query(async ({ input, ctx }) => {
    try {
      const warehouseFilter = input.warehouseId
        ? `AND s."warehouseId" = $2`
        : '';
      const params: any[] = [input.businessId];
      if (input.warehouseId) params.push(input.warehouseId);

      const rows = await prisma.$queryRawUnsafe<
        {
          productId: string;
          name: string;
          sku: string;
          unit: string;
          totalQuantity: string;
          totalValue: string;
          costPrice: string;
        }[]
      >(
        `SELECT
          p.id as "productId",
          p.name,
          p.sku,
          p.unit,
          COALESCE(SUM(s."currentQuantity"), 0) as "totalQuantity",
          COALESCE(SUM(s."currentValue"), 0) as "totalValue",
          p."costPrice"
        FROM products p
        LEFT JOIN inventory_stock s ON s."productId" = p.id ${warehouseFilter}
        WHERE p."businessId" = $1 AND p."isActive" = true
        GROUP BY p.id, p.name, p.sku, p.unit, p."costPrice"
        HAVING COALESCE(SUM(s."currentQuantity"), 0) != 0
        ORDER BY p.name ASC`,
        ...params,
      );

      const grandTotal = rows.reduce(
        (acc, r) => acc + parseFloat(r.totalValue),
        0,
      );

      return {
        items: rows,
        grandTotal,
      };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'fetch inventory valuation',
        userId: ctx.userId,
      });
    }
  });
