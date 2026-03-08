import {
  listAdmins,
  deactivateAdmin,
  activateAdmin,
  toggleSuperAdmin,
} from '../../controllers/admin/management';
import { t } from '../../trpc';

export const adminManagementRoutes = t.router({
  listAdmins,
  deactivateAdmin,
  activateAdmin,
  toggleSuperAdmin,
});
