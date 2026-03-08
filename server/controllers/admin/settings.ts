import { prisma } from '@seed/database';
import { adminProcedure, superAdminProcedure } from '../../trpc/procedures';
import { handleControllerError } from '../../helpers/controllerErrorHandler';
import { createAuditLog } from '../../helpers/adminAuth';
import { updateSettingSchema } from '@seed/schemas';

/**
 * Get all system settings.
 */
export const getSettings = adminProcedure.query(async ({ ctx }) => {
  try {
    const settings = await prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });

    // Convert to a key-value map for convenience
    const settingsMap: Record<string, unknown> = {};
    for (const setting of settings) {
      settingsMap[setting.key] = setting.value;
    }

    return { settings, settingsMap };
  } catch (error: unknown) {
    handleControllerError(error, {
      operation: 'get system settings',
      userId: ctx.userId,
    });
  }
});

/**
 * Update or create a system setting (superAdmin only).
 */
export const updateSetting = superAdminProcedure
  .input(updateSettingSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const setting = await prisma.systemSetting.upsert({
        where: { key: input.key },
        update: { value: input.value },
        create: { key: input.key, value: input.value },
      });

      await createAuditLog({
        adminId: ctx.adminId,
        action: 'UPDATE_SETTING',
        entity: 'system_setting',
        entityId: setting.id,
        details: { key: input.key, value: input.value },
      });

      return setting;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'update system setting',
        userId: ctx.userId,
      });
    }
  });
