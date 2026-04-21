import { t } from '../../../trpc';
import { businessMemberProcedure } from '../../../trpc/procedures';
import { z } from 'zod';
import * as ctrl from '../controllers/index';

export const accountingRoutes = t.router({
  getChartOfAccounts: businessMemberProcedure
    .input(z.object({ businessId: z.string() }))
    .query(({ ctx }) => ctrl.getChartOfAccounts(ctx.businessId)),

  createAccount: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        code: z.string().min(1),
        name: z.string().min(1),
        type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']),
        subType: z.enum(['CASH','BANK','ACCOUNTS_RECEIVABLE','INVENTORY','FIXED_ASSET','OTHER_ASSET','ACCOUNTS_PAYABLE','GST_PAYABLE','TDS_PAYABLE','LOAN','OTHER_LIABILITY','CAPITAL','RETAINED_EARNINGS','DRAWINGS','SALES','OTHER_INCOME','INTEREST_INCOME','PURCHASE','COGS','OPERATING_EXPENSE','DEPRECIATION','TAX_EXPENSE','OTHER_EXPENSE']),
        parentId: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .mutation(({ input, ctx }) => ctrl.createAccount(ctx.businessId, input)),

  getJournalEntries: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        page: z.number().default(1),
        limit: z.number().default(20),
        accountId: z.string().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      }),
    )
    .query(({ input, ctx }) => ctrl.getJournalEntries(ctx.businessId, input)),

  createManualJournalEntry: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        date: z.date(),
        narration: z.string().min(1),
        lines: z.array(
          z.object({
            accountId: z.string(),
            debit: z.number().min(0),
            credit: z.number().min(0),
            description: z.string().optional(),
          }),
        ).min(2),
      }),
    )
    .mutation(({ input, ctx }) => ctrl.createManualJournalEntry(ctx.businessId, input)),

  getTrialBalance: businessMemberProcedure
    .input(z.object({ businessId: z.string(), asOf: z.date().optional() }))
    .query(({ input, ctx }) => ctrl.getTrialBalance(ctx.businessId, input.asOf)),

  getProfitAndLoss: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        dateFrom: z.date(),
        dateTo: z.date(),
      }),
    )
    .query(({ input, ctx }) => ctrl.getProfitAndLoss(ctx.businessId, input.dateFrom, input.dateTo)),

  getBalanceSheet: businessMemberProcedure
    .input(z.object({ businessId: z.string(), asOf: z.date() }))
    .query(({ input, ctx }) => ctrl.getBalanceSheet(ctx.businessId, input.asOf)),

  getFiscalYears: businessMemberProcedure
    .input(z.object({ businessId: z.string() }))
    .query(({ ctx }) => ctrl.getFiscalYears(ctx.businessId)),

  createFiscalYear: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        name: z.string().min(1),
        startDate: z.date(),
        endDate: z.date(),
      }),
    )
    .mutation(({ input, ctx }) => ctrl.createFiscalYear(ctx.businessId, input)),
});
