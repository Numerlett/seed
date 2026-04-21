import { t } from '../../../trpc';
import { businessMemberProcedure } from '../../../trpc/procedures';
import { z } from 'zod';
import * as ctrl from '../controllers/index';

export const paymentsRoutes = t.router({
  getBankAccounts: businessMemberProcedure
    .input(z.object({ businessId: z.string() }))
    .query(({ ctx }) => ctrl.getBankAccounts(ctx.businessId)),

  createBankAccount: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        accountName: z.string().min(1),
        accountNo: z.string().min(1),
        ifsc: z.string().min(11).max(11),
        bankName: z.string().min(1),
        branch: z.string().optional(),
        openingBalance: z.number().optional(),
      }),
    )
    .mutation(({ input, ctx }) => ctrl.createBankAccount(ctx.businessId, input)),

  getPayments: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        page: z.number().default(1),
        limit: z.number().default(20),
        type: z.enum(['RECEIVED', 'MADE']).optional(),
        partyId: z.string().optional(),
      }),
    )
    .query(({ input, ctx }) => ctrl.getPayments(ctx.businessId, input)),

  recordPayment: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        date: z.date(),
        type: z.enum(['RECEIVED', 'MADE']),
        amount: z.number().positive(),
        method: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'WALLET', 'OTHER']),
        partyId: z.string().optional(),
        bankAccountId: z.string().optional(),
        reference: z.string().optional(),
        notes: z.string().optional(),
        allocations: z.array(
          z.object({
            invoiceId: z.string().optional(),
            billId: z.string().optional(),
            amount: z.number().positive(),
          }),
        ).optional(),
      }),
    )
    .mutation(({ input, ctx }) => ctrl.recordPayment(ctx.businessId, input)),

  getCheques: businessMemberProcedure
    .input(z.object({ businessId: z.string(), page: z.number().default(1), limit: z.number().default(20) }))
    .query(({ input, ctx }) => ctrl.getCheques(ctx.businessId, input)),

  getBankTransactions: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        bankAccountId: z.string(),
        page: z.number().default(1),
        limit: z.number().default(50),
        reconciled: z.boolean().optional(),
      }),
    )
    .query(({ input, ctx }) => ctrl.getBankTransactions(ctx.businessId, input.bankAccountId, input)),
});
