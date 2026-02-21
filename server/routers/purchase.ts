import {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrder,
  confirmPurchaseOrder,
  cancelPurchaseOrder,
  deletePurchaseOrder,
  createGRN,
  getGRNs,
  getGRNById,
  confirmGRN,
  cancelGRN,
  deleteGRN,
} from '../controllers/purchase';
import { t } from '../trpc';

export const purchaseRoutes = t.router({
  // Purchase Orders
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrder,
  confirmPurchaseOrder,
  cancelPurchaseOrder,
  deletePurchaseOrder,
  // GRN
  createGRN,
  getGRNs,
  getGRNById,
  confirmGRN,
  cancelGRN,
  deleteGRN,
});
