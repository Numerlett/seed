import { prisma } from '@seed/database';
import { protectedProcedure } from '../trpc/procedures';
import * as z from 'zod';
import { TRPCError } from '@trpc/server';
import { handleControllerError } from '../helpers/controllerErrorHandler';

export const getCategoriesByBusinessId = protectedProcedure
  .input(
    z.object({
      businessId: z.string(),
    }),
  )
  .query(async ({ input, ctx }) => {
    try {
      const categories = await prisma.category.findMany({
        where: {
          businessId: input.businessId,
        },
        include: {
          _count: {
            select: { products: true },
          },
        },
      });
      return categories;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'fetch categories',
        userId: ctx.userId,
      });
    }
  });

export const createCategory = protectedProcedure
  .input(
    z.object({
      name: z.string().min(1).max(100),
      businessId: z.string(),
      description: z.string().max(255).optional(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const newCategory = await prisma.category.create({
        data: input,
      });
      return newCategory;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'create category',
        fallbackMessage: 'This category name may already be in use',
        userId: ctx.userId,
      });
    }
  });

export const deleteCategory = protectedProcedure
  .input(
    z.object({
      categoryId: z.string(),
      businessId: z.string(),
    }),
  )
  .mutation(async ({ input: { categoryId, businessId }, ctx }) => {
    try {
      const category = await prisma.category.findFirst({
        where: { id: categoryId, businessId },
        include: {
          _count: {
            select: { products: true },
          },
        },
      });

      if (!category) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this category',
        });
      }

      if (category._count.products > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete category with associated products',
        });
      }

      await prisma.category.delete({
        where: { id: categoryId },
      });

      return { success: true };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'delete category',
        userId: ctx.userId,
      });
    }
  });
