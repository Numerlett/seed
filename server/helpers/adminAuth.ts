import { prisma } from '@seed/database';

/**
 * Create an audit log entry for an admin action.
 */
export async function createAuditLog(params: {
  adminId: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
}) {
  return prisma.auditLog.create({
    data: {
      adminId: params.adminId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      details: params.details
        ? (params.details as Record<string, string | number | boolean | null>)
        : undefined,
    },
  });
}

