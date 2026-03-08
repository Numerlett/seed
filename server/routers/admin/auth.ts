import { getAdminMe } from '../../controllers/admin/auth';
import { t } from '../../trpc';

export const adminAuthRoutes = t.router({
  getAdminMe,
});
