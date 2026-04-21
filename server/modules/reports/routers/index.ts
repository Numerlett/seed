import { t } from '../../../trpc';
import { businessMemberProcedure } from '../../../trpc/procedures';
import { z } from 'zod';
import * as ctrl from '../controllers/index';

export const reportsRoutes = t.router({
  getStockSummary: businessMemberProcedure
    .input(z.object({ businessId: z.string(), warehouseId: z.string().optional() }))
    .query(({ input, ctx }) => ctrl.getStockSummary(ctx.businessId, input.warehouseId)),

  getSalesRegister: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        dateFrom: z.date(),
        dateTo: z.date(),
        page: z.number().default(1),
        limit: z.number().default(50),
      }),
    )
    .query(({ input, ctx }) => ctrl.getSalesRegister(ctx.businessId, input)),

  getPurchaseRegister: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        dateFrom: z.date(),
        dateTo: z.date(),
        page: z.number().default(1),
        limit: z.number().default(50),
      }),
    )
    .query(({ input, ctx }) => ctrl.getPurchaseRegister(ctx.businessId, input)),

  getPartyStatement: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        partyId: z.string(),
        dateFrom: z.date(),
        dateTo: z.date(),
      }),
    )
    .query(({ input, ctx }) => ctrl.getPartyStatement(ctx.businessId, input.partyId, input)),

  getLowStockReport: businessMemberProcedure
    .input(z.object({ businessId: z.string() }))
    .query(({ ctx }) => ctrl.getLowStockReport(ctx.businessId)),
});
