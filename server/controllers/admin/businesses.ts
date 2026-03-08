import { prisma } from '@seed/database';
import { adminProcedure, superAdminProcedure } from '../../trpc/procedures';
import { handleControllerError } from '../../helpers/controllerErrorHandler';
import { createAuditLog } from '../../helpers/adminAuth';
import {
  listBusinessesSchema,
  getBusinessDetailSchema,
  deleteBusinessSchema,
} from '@seed/schemas';

/**
 * List all businesses with pagination and search.
 */
export const listBusinesses = adminProcedure
  .input(listBusinessesSchema)
  .query(async ({ input, ctx }) => {
    try {
      const { page, limit, search, sortBy, sortOrder } = input;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [businesses, total] = await Promise.all([
        prisma.business.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy || 'createdAt']: sortOrder },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            logoImage: true,
            createdAt: true,
            updatedAt: true,
            owner: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
            _count: {
              select: {
                members: true,
                products: true,
              },
            },
          },
        }),
        prisma.business.count({ where }),
      ]);

      return {
        businesses,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'list businesses',
        userId: ctx.userId,
      });
    }
  });

/**
 * Get detailed info about a specific business.
 */
export const getBusinessDetail = adminProcedure
  .input(getBusinessDetailSchema)
  .query(async ({ input, ctx }) => {
    try {
      const business = await prisma.business.findUnique({
        where: { id: input.businessId },
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              members: true,
              products: true,
              warehouses: true,
            },
          },
        },
      });

      if (!business) {
        throw new Error('Business not found');
      }

      return business;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'get business detail',
        userId: ctx.userId,
      });
    }
  });

/**
 * Delete a business (superAdmin only). Cascading delete.
 */
export const deleteBusiness = superAdminProcedure
  .input(deleteBusinessSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      await prisma.business.delete({
        where: { id: input.businessId },
      });

      await createAuditLog({
        adminId: ctx.adminId,
        action: 'DELETE_BUSINESS',
        entity: 'business',
        entityId: input.businessId,
      });

      return { success: true };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'delete business',
        userId: ctx.userId,
      });
    }
  });
