import { getDashboardData } from '../controllers/dashboard';
import { t } from '../trpc';

export const dashboardRoutes = t.router({
  getDashboardData,
});
