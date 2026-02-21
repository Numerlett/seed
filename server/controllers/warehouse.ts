import { prisma } from '@seed/database';
import { businessMemberProcedure } from '../trpc/procedures';
import * as z from 'zod';
import { TRPCError } from '@trpc/server';
import {
  warehouseSchema,
  warehouseUpdateSchema,
  shelfSchema,
  shelfUpdateSchema,
} from '@seed/schemas';
import { handleControllerError } from '../helpers/controllerErrorHandler';

// =====================================================
// WAREHOUSE CONTROLLERS
// =====================================================

export const createWarehouse = businessMemberProcedure
  .input(warehouseSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const warehouse = await prisma.warehouse.create({
        data: {
          name: input.name,
          location: input.location,
          isActive: input.isActive,
          businessId: input.businessId,
        },
      });
      return warehouse;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'create warehouse',
        userId: ctx.userId,
        fallbackMessage: 'This warehouse name may already be in use',
      });
    }
  });

export const getWarehouses = businessMemberProcedure
  .input(
    z.object({
      businessId: z.string(),
      isActive: z.boolean().optional(),
      search: z.string().optional(),
    }),
  )
  .query(async ({ input: { businessId, isActive, search }, ctx }) => {
    try {
      const where: any = { businessId };

      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
        ];
      }

      const warehouses = await prisma.warehouse.findMany({
        where,
        include: {
          _count: {
            select: { shelves: true },
          },
        },
        orderBy: { name: 'asc' },
      });
      return warehouses;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'fetch warehouses',
        userId: ctx.userId,
      });
    }
  });

export const getWarehouseById = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .query(async ({ input, ctx }) => {
    try {
      const warehouse = await prisma.warehouse.findFirst({
        where: { id: input.id, businessId: input.businessId },
        include: {
          shelves: {
            orderBy: { shelfCode: 'asc' },
          },
          _count: {
            select: { shelves: true, stockSummaries: true },
          },
        },
      });

      if (!warehouse) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Warehouse not found',
        });
      }

      return warehouse;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'fetch warehouse',
        userId: ctx.userId,
      });
    }
  });

export const updateWarehouse = businessMemberProcedure
  .input(
    z.object({
      id: z.string(),
      businessId: z.string(),
      data: warehouseUpdateSchema,
    }),
  )
  .mutation(async ({ input, ctx }) => {
    try {
      // Verify warehouse belongs to this business
      const existing = await prisma.warehouse.findFirst({
        where: { id: input.id, businessId: input.businessId },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Warehouse not found',
        });
      }

      const warehouse = await prisma.warehouse.update({
        where: { id: input.id },
        data: input.data,
      });
      return warehouse;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'update warehouse',
        userId: ctx.userId,
      });
    }
  });

export const deleteWarehouse = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    try {
      const warehouse = await prisma.warehouse.findFirst({
        where: { id: input.id, businessId: input.businessId },
        include: {
          _count: {
            select: { stockSummaries: true },
          },
        },
      });

      if (!warehouse) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Warehouse not found',
        });
      }

      if (warehouse._count.stockSummaries > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete warehouse that has existing stock',
        });
      }

      await prisma.warehouse.delete({ where: { id: input.id } });
      return { success: true };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'delete warehouse',
        userId: ctx.userId,
      });
    }
  });

// =====================================================
// SHELF CONTROLLERS
// =====================================================

export const createShelf = businessMemberProcedure
  .input(shelfSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      // Verify warehouse belongs to this business
      const warehouse = await prisma.warehouse.findFirst({
        where: { id: input.warehouseId, businessId: input.businessId },
      });

      if (!warehouse) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Warehouse not found',
        });
      }

      const shelf = await prisma.shelf.create({
        data: {
          shelfCode: input.shelfCode,
          description: input.description,
          isActive: input.isActive,
          warehouseId: input.warehouseId,
        },
      });
      return shelf;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'create shelf',
        userId: ctx.userId,
        fallbackMessage:
          'This shelf code may already be in use for this warehouse',
      });
    }
  });

export const getShelvesByWarehouse = businessMemberProcedure
  .input(
    z.object({
      warehouseId: z.string(),
      businessId: z.string(),
      isActive: z.boolean().optional(),
    }),
  )
  .query(async ({ input: { warehouseId, businessId, isActive }, ctx }) => {
    try {
      // Verify warehouse belongs to this business
      const warehouse = await prisma.warehouse.findFirst({
        where: { id: warehouseId, businessId },
      });

      if (!warehouse) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Warehouse not found',
        });
      }

      const where: any = { warehouseId };
      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      const shelves = await prisma.shelf.findMany({
        where,
        orderBy: { shelfCode: 'asc' },
      });
      return shelves;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'fetch shelves',
        userId: ctx.userId,
      });
    }
  });

export const updateShelf = businessMemberProcedure
  .input(
    z.object({
      id: z.string(),
      businessId: z.string(),
      data: shelfUpdateSchema,
    }),
  )
  .mutation(async ({ input, ctx }) => {
    try {
      // Verify shelf's warehouse belongs to this business
      const shelf = await prisma.shelf.findUnique({
        where: { id: input.id },
        include: { warehouse: { select: { businessId: true } } },
      });

      if (!shelf || shelf.warehouse.businessId !== input.businessId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Shelf not found',
        });
      }

      const updated = await prisma.shelf.update({
        where: { id: input.id },
        data: input.data,
      });
      return updated;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'update shelf',
        userId: ctx.userId,
      });
    }
  });

export const deleteShelf = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    try {
      const shelf = await prisma.shelf.findUnique({
        where: { id: input.id },
        include: {
          warehouse: { select: { businessId: true } },
          _count: { select: { stockSummaries: true } },
        },
      });

      if (!shelf || shelf.warehouse.businessId !== input.businessId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Shelf not found',
        });
      }

      if (shelf._count.stockSummaries > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete shelf that has existing stock',
        });
      }

      await prisma.shelf.delete({ where: { id: input.id } });
      return { success: true };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'delete shelf',
        userId: ctx.userId,
      });
    }
  });
