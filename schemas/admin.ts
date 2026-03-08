import * as z from 'zod';

// ----- Pagination & Search -----

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ----- Admin User Management -----

export const listUsersSchema = paginationSchema.extend({
  status: z.enum(['all', 'active', 'inactive']).default('all'),
});

export const getUserDetailSchema = z.object({
  userId: z.string(),
});

export const toggleUserSchema = z.object({
  userId: z.string(),
});

export const deleteUserSchema = z.object({
  userId: z.string(),
});

// ----- Admin Business Management -----

export const listBusinessesSchema = paginationSchema.extend({
  status: z.enum(['all', 'active', 'inactive']).default('all'),
});

export const getBusinessDetailSchema = z.object({
  businessId: z.string(),
});

export const toggleBusinessSchema = z.object({
  businessId: z.string(),
});

export const deleteBusinessSchema = z.object({
  businessId: z.string(),
});

// ----- Admin Analytics -----

export const analyticsTimeRangeSchema = z.object({
  range: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
});

export const topBusinessesSchema = z.object({
  limit: z.number().int().min(1).max(50).default(10),
  sortBy: z.enum(['members', 'products', 'transactions']).default('members'),
});

// ----- Admin Settings -----

export const updateSettingSchema = z.object({
  key: z.string().min(1),
  value: z.any(),
});

export const getSettingSchema = z.object({
  key: z.string().min(1),
});

// ----- Admin Audit Log -----

export const auditLogFilterSchema = paginationSchema.extend({
  adminId: z.string().optional(),
  action: z.string().optional(),
  entity: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// ----- Admin Management -----

export const createAdminSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1).optional(),
  isSuperAdmin: z.boolean().default(false),
});

export const toggleAdminSchema = z.object({
  adminId: z.string(),
});

export const updateAdminSchema = z.object({
  adminId: z.string(),
  name: z.string().optional(),
  isSuperAdmin: z.boolean().optional(),
});
