import {
  createWarehouse,
  getWarehouses,
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse,
  createShelf,
  getShelvesByWarehouse,
  updateShelf,
  deleteShelf,
} from '../controllers/warehouse';
import { t } from '../trpc';

export const warehouseRoutes = t.router({
  createWarehouse,
  getWarehouses,
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse,
  createShelf,
  getShelvesByWarehouse,
  updateShelf,
  deleteShelf,
});
