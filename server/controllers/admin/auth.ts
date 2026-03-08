import { prisma } from '@seed/database';
import { adminProcedure } from '../../trpc/procedures';
import { handleControllerError } from '../../helpers/controllerErrorHandler';

/**
 * Get the current admin's profile info.
 * Returns the admin record along with the associated user data.
 */
export const getAdminMe = adminProcedure.query(async ({ ctx }) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: ctx.adminId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            picture: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return admin;
  } catch (error: unknown) {
    handleControllerError(error, {
      operation: 'fetch admin profile',
      userId: ctx.userId,
    });
  }
});
