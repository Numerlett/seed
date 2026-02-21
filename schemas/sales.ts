import * as z from 'zod';

// ----- Sale Invoice -----

export const saleInvoiceItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
  taxRate: z.number().min(0).max(100).default(0),
  discount: z.number().min(0).max(100).default(0),
  shelfId: z.string().optional(),
  batchId: z.string().optional(),
});

export const saleInvoiceSchema = z.object({
  documentNumber: z.string().optional(), // auto-generated if empty
  invoiceDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  customerId: z.string(),
  warehouseId: z.string(),
  businessId: z.string(),
  items: z.array(saleInvoiceItemSchema).min(1, 'At least one item is required'),
});

export const saleInvoiceUpdateSchema = z.object({
  invoiceDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  customerId: z.string().optional(),
  warehouseId: z.string().optional(),
  items: z.array(saleInvoiceItemSchema).min(1).optional(),
});

// ----- Sales Return -----

export const salesReturnItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().nonnegative(),
  shelfId: z.string().optional(),
  batchId: z.string().optional(),
});

export const salesReturnSchema = z.object({
  documentNumber: z.string().optional(),
  returnDate: z.coerce.date().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
  customerId: z.string(),
  saleInvoiceId: z.string().optional(),
  warehouseId: z.string(),
  businessId: z.string(),
  items: z.array(salesReturnItemSchema).min(1, 'At least one item is required'),
});
