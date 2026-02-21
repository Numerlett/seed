import * as z from 'zod';

// ----- Warehouse -----

export const warehouseSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  location: z.string().max(255).optional(),
  isActive: z.boolean().default(true),
  businessId: z.string(),
});

export const warehouseUpdateSchema = warehouseSchema
  .omit({ businessId: true })
  .partial();

// ----- Shelf -----

export const shelfSchema = z.object({
  shelfCode: z
    .string()
    .min(1, 'Shelf code is required')
    .max(50, 'Shelf code must be less than 50 characters'),
  description: z.string().max(255).optional(),
  isActive: z.boolean().default(true),
  warehouseId: z.string(),
  businessId: z.string(),
});

export const shelfUpdateSchema = shelfSchema
  .omit({ warehouseId: true, businessId: true })
  .partial();

// ----- Product Batch -----

export const productBatchSchema = z.object({
  batchNumber: z.string().min(1, 'Batch number is required'),
  expiryDate: z.coerce.date().optional(),
  manufacturingDate: z.coerce.date().optional(),
  purchasePrice: z.number().nonnegative('Purchase price must be non-negative'),
  productId: z.string(),
  businessId: z.string(),
});

export const productBatchUpdateSchema = z.object({
  batchNumber: z.string().min(1).optional(),
  expiryDate: z.coerce.date().optional().nullable(),
  manufacturingDate: z.coerce.date().optional().nullable(),
  purchasePrice: z.number().nonnegative().optional(),
});
