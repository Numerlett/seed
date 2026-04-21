import { t } from '../../../trpc';
import { businessMemberProcedure } from '../../../trpc/procedures';
import { z } from 'zod';
import * as ctrl from '../controllers/index';

export const manufacturingRoutes = t.router({
  getBoms: businessMemberProcedure
    .input(z.object({ businessId: z.string(), page: z.number().default(1), limit: z.number().default(20) }))
    .query(({ input, ctx }) => ctrl.getBoms(ctx.businessId, input)),

  createBom: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        productId: z.string(),
        version: z.number().int().positive().default(1),
        yieldQuantity: z.number().positive(),
        components: z.array(
          z.object({
            componentProductId: z.string(),
            quantity: z.number().positive(),
            unit: z.string().optional(),
            scrapPercent: z.number().min(0).max(100).optional(),
          }),
        ).min(1),
      }),
    )
    .mutation(({ input, ctx }) => ctrl.createBom(ctx.businessId, input)),

  getWorkOrders: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        page: z.number().default(1),
        limit: z.number().default(20),
        status: z.enum(['DRAFT', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
      }),
    )
    .query(({ input, ctx }) => ctrl.getWorkOrders(ctx.businessId, input)),

  createWorkOrder: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        bomId: z.string(),
        plannedQuantity: z.number().positive(),
        startDate: z.date(),
        endDate: z.date().optional(),
        warehouseId: z.string(),
        notes: z.string().optional(),
      }),
    )
    .mutation(({ input, ctx }) => ctrl.createWorkOrder(ctx.businessId, input)),

  updateWorkOrderStatus: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        workOrderId: z.string(),
        status: z.enum(['DRAFT', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
      }),
    )
    .mutation(({ input, ctx }) => ctrl.updateWorkOrderStatus(ctx.businessId, input.workOrderId, input.status)),
});
