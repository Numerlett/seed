import * as z from 'zod';

// ----- Stock Adjustment -----

export const stockAdjustmentItemSchema = z.object({
  productId: z.string(),
  systemQuantity: z.number().nonnegative(),
  actualQuantity: z.number().nonnegative(),
  unitCost: z.number().nonnegative(),
  shelfId: z.string().optional(),
  batchId: z.string().optional(),
});

export const stockAdjustmentSchema = z.object({
  documentNumber: z.string().optional(),
  adjustmentDate: z.coerce.date().optional(),
  reason: z.string().min(1, 'Reason is required'),
  notes: z.string().optional(),
  warehouseId: z.string(),
  businessId: z.string(),
  items: z
    .array(stockAdjustmentItemSchema)
    .min(1, 'At least one item is required'),
});

// ----- Stock Transfer -----

export const stockTransferItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive('Quantity must be positive'),
  unitCost: z.number().nonnegative(),
  batchId: z.string().optional(),
});

export const stockTransferSchema = z.object({
  documentNumber: z.string().optional(),
  transferDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  sourceWarehouseId: z.string(),
  sourceShelfId: z.string().optional(),
  destWarehouseId: z.string(),
  destShelfId: z.string().optional(),
  businessId: z.string(),
  items: z
    .array(stockTransferItemSchema)
    .min(1, 'At least one item is required'),
});

// ----- Damage Report -----

export const damageReportItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive('Quantity must be positive'),
  unitCost: z.number().nonnegative(),
  damageType: z.enum(['DAMAGED', 'EXPIRED', 'LOST', 'OTHER']),
  shelfId: z.string().optional(),
  batchId: z.string().optional(),
});

export const damageReportSchema = z.object({
  documentNumber: z.string().optional(),
  reportDate: z.coerce.date().optional(),
  reason: z.string().min(1, 'Reason is required'),
  notes: z.string().optional(),
  warehouseId: z.string(),
  businessId: z.string(),
  items: z
    .array(damageReportItemSchema)
    .min(1, 'At least one item is required'),
});
