import {
  createPurchaseReturn,
  getPurchaseReturns,
  getPurchaseReturnById,
  confirmPurchaseReturn,
  cancelPurchaseReturn,
  createSalesReturn,
  getSalesReturns,
  getSalesReturnById,
  confirmSalesReturn,
  cancelSalesReturn,
} from '../controllers/returns';
import { t } from '../trpc';

export const returnsRoutes = t.router({
  // Purchase Returns
  createPurchaseReturn,
  getPurchaseReturns,
  getPurchaseReturnById,
  confirmPurchaseReturn,
  cancelPurchaseReturn,
  // Sales Returns
  createSalesReturn,
  getSalesReturns,
  getSalesReturnById,
  confirmSalesReturn,
  cancelSalesReturn,
});
