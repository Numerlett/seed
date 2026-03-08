import { t } from '../../trpc';
import { adminAuthRoutes } from './auth';
import { adminUsersRoutes } from './users';
import { adminBusinessesRoutes } from './businesses';
import { adminAnalyticsRoutes } from './analytics';
import { adminSettingsRoutes } from './settings';
import { adminAuditLogRoutes } from './auditLog';
import { adminManagementRoutes } from './management';

export const adminRoutes = t.router({
  auth: adminAuthRoutes,
  users: adminUsersRoutes,
  businesses: adminBusinessesRoutes,
  analytics: adminAnalyticsRoutes,
  settings: adminSettingsRoutes,
  auditLog: adminAuditLogRoutes,
  management: adminManagementRoutes,
});
