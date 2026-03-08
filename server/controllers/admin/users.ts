import { prisma } from '@seed/database';
import { adminProcedure, superAdminProcedure } from '../../trpc/procedures';
import { handleControllerError } from '../../helpers/controllerErrorHandler';
import { createAuditLog } from '../../helpers/adminAuth';
import {
  listUsersSchema,
  getUserDetailSchema,
  deleteUserSchema,
} from '@seed/schemas';

/**
 * List all users with pagination and search.
 */
export const listUsers = adminProcedure
  .input(listUsersSchema)
  .query(async ({ input, ctx }) => {
    try {
      const { page, limit, search, sortBy, sortOrder } = input;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy || 'createdAt']: sortOrder },
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            picture: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                memberships: true,
                businessesOwned: true,
              },
            },
          },
        }),
        prisma.user.count({ where }),
      ]);

      return {
        users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'list users',
        userId: ctx.userId,
      });
    }
  });

/**
 * Get detailed info about a specific user.
 */
export const getUserDetail = adminProcedure
  .input(getUserDetailSchema)
  .query(async ({ input, ctx }) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        include: {
          memberships: {
            include: {
              business: {
                select: {
                  id: true,
                  name: true,
                  createdAt: true,
                },
              },
            },
          },
          businessesOwned: {
            select: {
              id: true,
              name: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              memberships: true,
              businessesOwned: true,
              refreshTokens: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'get user detail',
        userId: ctx.userId,
      });
    }
  });

/**
 * Delete a user (superAdmin only). Cascading delete.
 */
export const deleteUser = superAdminProcedure
  .input(deleteUserSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      await prisma.user.delete({
        where: { id: input.userId },
      });

      await createAuditLog({
        adminId: ctx.adminId,
        action: 'DELETE_USER',
        entity: 'user',
        entityId: input.userId,
      });

      return { success: true };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'delete user',
        userId: ctx.userId,
      });
    }
  });
