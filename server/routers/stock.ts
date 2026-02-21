import {
  getStockSummary,
  getStockByProduct,
  getStockByWarehouse,
  getLowStockAlerts,
  getProductLedger,
  getInventoryValuation,
} from '../controllers/stock';
import { t } from '../trpc';

export const stockRoutes = t.router({
  getStockSummary,
  getStockByProduct,
  getStockByWarehouse,
  getLowStockAlerts,
  getProductLedger,
  getInventoryValuation,
});
