import { prisma } from '@seed/database';
import { adminProcedure } from '../../trpc/procedures';
import { handleControllerError } from '../../helpers/controllerErrorHandler';
import { auditLogFilterSchema } from '@seed/schemas';

/**
 * Get audit logs with pagination and filters.
 */
export const getAuditLogs = adminProcedure
  .input(auditLogFilterSchema)
  .query(async ({ input, ctx }) => {
    try {
      const { page, limit, adminId, action, entity, startDate, endDate } = input;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (adminId) where.adminId = adminId;
      if (action) where.action = action;
      if (entity) where.entity = entity;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            admin: {
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
          },
        }),
        prisma.auditLog.count({ where }),
      ]);

      return {
        logs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'get audit logs',
        userId: ctx.userId,
      });
    }
  });
