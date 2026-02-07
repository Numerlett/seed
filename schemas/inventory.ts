import * as z from 'zod';

export const productSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  description: z.string().max(255).optional(),
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  weight: z.number().positive().optional(),
  dimensions: z.string().optional(),
  image: z.string().url().optional().or(z.literal('')),
  attachments: z.array(z.string()).optional(),
  unit: z.string().default('pcs'),
  secondaryUnit: z.string().optional(),
  unitConvertion: z.number().positive().optional(),
  currentStockLevel: z.number().default(0),
  minStockLevel: z.number().nonnegative().optional(),
  maxStockLevel: z.number().nonnegative().optional(),
  reorderLevel: z.number().nonnegative().optional(),
  costPrice: z.number().nonnegative('Cost price must be a positive number'),
  sellingPrice: z
    .number()
    .nonnegative('Selling price must be a positive number'),
  mrp: z.number().nonnegative().optional(),
  taxRate: z.number().min(0).max(100, 'Tax rate must be between 0 and 100'),
  discountRate: z
    .number()
    .min(0)
    .max(100, 'Discount rate must be between 0 and 100'),
  isActive: z.boolean().default(true),
  isService: z.boolean().default(false),
  allowNegative: z.boolean().default(false),
  businessId: z.string(),
  categoryId: z.string().optional(),
});

export const productFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  weight: z.string().optional(),
  dimensions: z.string().optional(),
  image: z.string().optional(), // Will be set after upload
  attachments: z.string().optional(), // Will be set after upload
  unit: z.string(),
  secondaryUnit: z.string().optional(),
  unitConvertion: z.string().optional(),
  currentStockLevel: z.string(),
  minStockLevel: z.string().optional(),
  maxStockLevel: z.string().optional(),
  reorderLevel: z.string().optional(),
  costPrice: z.string().min(1, 'Cost price is required'),
  sellingPrice: z.string().min(1, 'Selling price is required'),
  mrp: z.string().optional(),
  taxRate: z.string(),
  discountRate: z.string(),
  isActive: z.boolean(),
  isService: z.boolean(),
  allowNegative: z.boolean(),
  categoryId: z.string().optional(),
});
