import { prisma } from '@seed/database';
import { adminProcedure } from '../../trpc/procedures';
import { handleControllerError } from '../../helpers/controllerErrorHandler';
import { analyticsTimeRangeSchema, topBusinessesSchema } from '@seed/schemas';

/**
 * Get high-level platform statistics.
 */
export const getPlatformStats = adminProcedure.query(async ({ ctx }) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalBusinesses,
      totalAdmins,
      newUsersLast7d,
      newUsersLast30d,
      newBusinessesLast7d,
      newBusinessesLast30d,
      activeSessions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.business.count(),
      prisma.admin.count({ where: { isActive: true } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.business.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.business.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.refreshToken.count({
        where: { isRevoked: false, expiresAt: { gt: now } },
      }),
    ]);

    return {
      totalUsers,
      totalBusinesses,
      totalAdmins,
      newUsersLast7d,
      newUsersLast30d,
      newBusinessesLast7d,
      newBusinessesLast30d,
      activeSessions,
    };
  } catch (error: unknown) {
    handleControllerError(error, {
      operation: 'get platform stats',
      userId: ctx.userId,
    });
  }
});

/**
 * Get user growth time-series data.
 */
export const getUserGrowth = adminProcedure
  .input(analyticsTimeRangeSchema)
  .query(async ({ input, ctx }) => {
    try {
      const days = input.range === '7d' ? 7 : input.range === '30d' ? 30 : input.range === '90d' ? 90 : 365;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const users = await prisma.user.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      });

      // Group by date
      const grouped: Record<string, number> = {};
      for (const user of users) {
        const dateKey = user.createdAt.toISOString().split('T')[0];
        grouped[dateKey] = (grouped[dateKey] || 0) + 1;
      }

      // Fill in missing dates
      const data: { date: string; count: number }[] = [];
      const current = new Date(startDate);
      const now = new Date();
      while (current <= now) {
        const dateKey = current.toISOString().split('T')[0];
        data.push({ date: dateKey, count: grouped[dateKey] || 0 });
        current.setDate(current.getDate() + 1);
      }

      return data;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'get user growth',
        userId: ctx.userId,
      });
    }
  });

/**
 * Get business growth time-series data.
 */
export const getBusinessGrowth = adminProcedure
  .input(analyticsTimeRangeSchema)
  .query(async ({ input, ctx }) => {
    try {
      const days = input.range === '7d' ? 7 : input.range === '30d' ? 30 : input.range === '90d' ? 90 : 365;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const businesses = await prisma.business.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      });

      const grouped: Record<string, number> = {};
      for (const biz of businesses) {
        const dateKey = biz.createdAt.toISOString().split('T')[0];
        grouped[dateKey] = (grouped[dateKey] || 0) + 1;
      }

      const data: { date: string; count: number }[] = [];
      const current = new Date(startDate);
      const now = new Date();
      while (current <= now) {
        const dateKey = current.toISOString().split('T')[0];
        data.push({ date: dateKey, count: grouped[dateKey] || 0 });
        current.setDate(current.getDate() + 1);
      }

      return data;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'get business growth',
        userId: ctx.userId,
      });
    }
  });

/**
 * Get top businesses by member count.
 */
export const getTopBusinesses = adminProcedure
  .input(topBusinessesSchema)
  .query(async ({ input, ctx }) => {
    try {
      const businesses = await prisma.business.findMany({
        take: input.limit,
        select: {
          id: true,
          name: true,
          createdAt: true,
          owner: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: {
              members: true,
              products: true,
            },
          },
        },
        orderBy: input.sortBy === 'products'
          ? { products: { _count: 'desc' } }
          : { members: { _count: 'desc' } },
      });

      return businesses;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'get top businesses',
        userId: ctx.userId,
      });
    }
  });
