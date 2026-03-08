import { getAuditLogs } from '../../controllers/admin/auditLog';
import { t } from '../../trpc';

export const adminAuditLogRoutes = t.router({
  getAuditLogs,
});
