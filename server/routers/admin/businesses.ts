import {
  listBusinesses,
  getBusinessDetail,
  deleteBusiness,
} from '../../controllers/admin/businesses';
import { t } from '../../trpc';

export const adminBusinessesRoutes = t.router({
  listBusinesses,
  getBusinessDetail,
  deleteBusiness,
});
