import {
  getPlatformStats,
  getUserGrowth,
  getBusinessGrowth,
  getTopBusinesses,
} from '../../controllers/admin/analytics';
import { t } from '../../trpc';

export const adminAnalyticsRoutes = t.router({
  getPlatformStats,
  getUserGrowth,
  getBusinessGrowth,
  getTopBusinesses,
});
