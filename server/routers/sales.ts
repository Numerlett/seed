import {
  createSaleInvoice,
  getSaleInvoices,
  getSaleInvoiceById,
  updateSaleInvoice,
  confirmSaleInvoice,
  cancelSaleInvoice,
  deleteSaleInvoice,
  updatePaymentStatus,
} from '../controllers/sales';
import { t } from '../trpc';

export const salesRoutes = t.router({
  createSaleInvoice,
  getSaleInvoices,
  getSaleInvoiceById,
  updateSaleInvoice,
  confirmSaleInvoice,
  cancelSaleInvoice,
  deleteSaleInvoice,
  updatePaymentStatus,
});
