import {
  createBatch,
  getBatchesByProduct,
  getBatchById,
  updateBatch,
  markBatchExpired,
  getExpiringBatches,
  deleteBatch,
} from '../controllers/batch';
import { t } from '../trpc';

export const batchRoutes = t.router({
  createBatch,
  getBatchesByProduct,
  getBatchById,
  updateBatch,
  markBatchExpired,
  getExpiringBatches,
  deleteBatch,
});
