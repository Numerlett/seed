import {
  createStockAdjustment,
  getStockAdjustments,
  getStockAdjustmentById,
  confirmStockAdjustment,
  cancelStockAdjustment,
  createStockTransfer,
  getStockTransfers,
  getStockTransferById,
  confirmStockTransfer,
  cancelStockTransfer,
  createDamageReport,
  getDamageReports,
  getDamageReportById,
  confirmDamageReport,
  cancelDamageReport,
} from '../controllers/stockops';
import { t } from '../trpc';

export const stockopsRoutes = t.router({
  // Stock Adjustments
  createStockAdjustment,
  getStockAdjustments,
  getStockAdjustmentById,
  confirmStockAdjustment,
  cancelStockAdjustment,
  // Stock Transfers
  createStockTransfer,
  getStockTransfers,
  getStockTransferById,
  confirmStockTransfer,
  cancelStockTransfer,
  // Damage Reports
  createDamageReport,
  getDamageReports,
  getDamageReportById,
  confirmDamageReport,
  cancelDamageReport,
});
