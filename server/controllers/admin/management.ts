import { prisma } from '@seed/database';
import { superAdminProcedure } from '../../trpc/procedures';
import { handleControllerError } from '../../helpers/controllerErrorHandler';
import { createAuditLog } from '../../helpers/adminAuth';
import { toggleAdminSchema } from '@seed/schemas';
import * as z from 'zod';

/**
 * List all admins (superAdmin only).
 */
export const listAdmins = superAdminProcedure.query(async ({ ctx }) => {
  try {
    const admins = await prisma.admin.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            picture: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return admins;
  } catch (error: unknown) {
    handleControllerError(error, {
      operation: 'list admins',
      userId: ctx.userId,
    });
  }
});

/**
 * Deactivate an admin (superAdmin only).
 */
export const deactivateAdmin = superAdminProcedure
  .input(toggleAdminSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      if (input.adminId === ctx.adminId) {
        throw new Error('Cannot deactivate yourself');
      }

      const admin = await prisma.admin.update({
        where: { id: input.adminId },
        data: { isActive: false },
      });

      await createAuditLog({
        adminId: ctx.adminId,
        action: 'DEACTIVATE_ADMIN',
        entity: 'admin',
        entityId: input.adminId,
      });

      return admin;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'deactivate admin',
        userId: ctx.userId,
      });
    }
  });

/**
 * Activate an admin (superAdmin only).
 */
export const activateAdmin = superAdminProcedure
  .input(toggleAdminSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const admin = await prisma.admin.update({
        where: { id: input.adminId },
        data: { isActive: true },
      });

      await createAuditLog({
        adminId: ctx.adminId,
        action: 'ACTIVATE_ADMIN',
        entity: 'admin',
        entityId: input.adminId,
      });

      return admin;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'activate admin',
        userId: ctx.userId,
      });
    }
  });

/**
 * Toggle super admin status (superAdmin only).
 */
export const toggleSuperAdmin = superAdminProcedure
  .input(
    z.object({
      adminId: z.string(),
      isSuperAdmin: z.boolean(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    try {
      if (input.adminId === ctx.adminId) {
        throw new Error('Cannot change your own super admin status');
      }

      const admin = await prisma.admin.update({
        where: { id: input.adminId },
        data: { isSuperAdmin: input.isSuperAdmin },
      });

      await createAuditLog({
        adminId: ctx.adminId,
        action: input.isSuperAdmin
          ? 'PROMOTE_SUPER_ADMIN'
          : 'DEMOTE_SUPER_ADMIN',
        entity: 'admin',
        entityId: input.adminId,
      });

      return admin;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'toggle super admin',
        userId: ctx.userId,
      });
    }
  });
