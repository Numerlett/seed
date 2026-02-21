import * as z from 'zod';

// ----- Shared line item base -----

const lineItemBase = z.object({
  productId: z.string(),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
  taxRate: z.number().min(0).max(100).default(0),
  discount: z.number().min(0).max(100).default(0),
});

// ----- Purchase Order -----

export const purchaseOrderItemSchema = lineItemBase;

export const purchaseOrderSchema = z.object({
  documentNumber: z.string().optional(), // auto-generated if empty
  orderDate: z.coerce.date().optional(),
  expectedDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  supplierId: z.string(),
  businessId: z.string(),
  items: z
    .array(purchaseOrderItemSchema)
    .min(1, 'At least one item is required'),
});

export const purchaseOrderUpdateSchema = z.object({
  orderDate: z.coerce.date().optional(),
  expectedDate: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  supplierId: z.string().optional(),
  items: z.array(purchaseOrderItemSchema).min(1).optional(),
});

// ----- GRN (Goods Receipt Note) -----

export const grnItemSchema = z.object({
  productId: z.string(),
  quantityReceived: z.number().positive('Quantity received must be positive'),
  quantityOrdered: z.number().positive().optional(),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
  shelfId: z.string().optional(),
  batchId: z.string().optional(),
  // For creating a new batch inline during GRN
  newBatch: z
    .object({
      batchNumber: z.string().min(1),
      expiryDate: z.coerce.date().optional(),
      manufacturingDate: z.coerce.date().optional(),
    })
    .optional(),
});

export const grnSchema = z.object({
  documentNumber: z.string().optional(),
  receivedDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  purchaseOrderId: z.string().optional(),
  supplierId: z.string(),
  warehouseId: z.string(),
  businessId: z.string(),
  items: z.array(grnItemSchema).min(1, 'At least one item is required'),
});

// ----- Purchase Return -----

export const purchaseReturnItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().nonnegative(),
  shelfId: z.string().optional(),
  batchId: z.string().optional(),
});

export const purchaseReturnSchema = z.object({
  documentNumber: z.string().optional(),
  returnDate: z.coerce.date().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
  supplierId: z.string(),
  grnId: z.string().optional(),
  warehouseId: z.string(),
  businessId: z.string(),
  items: z
    .array(purchaseReturnItemSchema)
    .min(1, 'At least one item is required'),
});
