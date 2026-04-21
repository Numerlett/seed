import { t } from '../../../trpc';
import { businessMemberProcedure, protectedProcedure } from '../../../trpc/procedures';
import { z } from 'zod';
import * as taxController from '../controllers/index';

export const taxRoutes = t.router({
  // GST Registration
  getGstProfile: businessMemberProcedure
    .input(z.object({ businessId: z.string() }))
    .query(({ input, ctx }) => taxController.getGstProfile(ctx.businessId)),

  upsertGstProfile: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        gstin: z.string().length(15),
        tradeName: z.string().min(1),
        legalName: z.string().min(1),
        registrationType: z.enum(['REGULAR', 'COMPOSITION', 'UNREGISTERED']),
        placeOfBusiness: z.string().optional(),
        pan: z.string().optional(),
      }),
    )
    .mutation(({ input, ctx }) => taxController.upsertGstProfile(ctx.businessId, input)),

  // HSN/SAC lookup
  searchHsn: businessMemberProcedure
    .input(z.object({ businessId: z.string(), query: z.string().min(1) }))
    .query(({ input }) => taxController.searchHsn(input.query)),

  // Tax rates
  getTaxRates: businessMemberProcedure
    .input(z.object({ businessId: z.string() }))
    .query(() => taxController.getTaxRates()),

  // Compute tax for a set of lines (used by invoice/PO creation UI)
  computeTax: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        lines: z.array(
          z.object({
            quantity: z.number(),
            unitPrice: z.number(),
            discountAmount: z.number().optional(),
            taxRatePercent: z.number(),
            cessRatePercent: z.number().optional(),
            hsnCode: z.string().optional(),
          }),
        ),
        buyerStateCode: z.string(),
        buyerGstin: z.string().optional(),
      }),
    )
    .query(({ input, ctx }) =>
      taxController.computeTaxForLines(ctx.businessId, input),
    ),

  // E-Invoice
  generateIrn: businessMemberProcedure
    .input(z.object({ businessId: z.string(), invoiceId: z.string() }))
    .mutation(({ input, ctx }) =>
      taxController.generateIrn(ctx.businessId, input.invoiceId),
    ),

  cancelIrn: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        invoiceId: z.string(),
        reason: z.enum(['1', '2', '3', '4', '5']),
        remarks: z.string().min(1),
      }),
    )
    .mutation(({ input, ctx }) =>
      taxController.cancelIrn(ctx.businessId, input.invoiceId, input.reason, input.remarks),
    ),

  getEInvoices: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        page: z.number().default(1),
        limit: z.number().default(20),
        status: z.enum(['PENDING', 'GENERATED', 'CANCELLED']).optional(),
      }),
    )
    .query(({ input, ctx }) => taxController.getEInvoices(ctx.businessId, input)),

  // E-Way Bill
  getEWayBills: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        page: z.number().default(1),
        limit: z.number().default(20),
      }),
    )
    .query(({ input, ctx }) => taxController.getEWayBills(ctx.businessId, input)),

  generateEwayBill: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        invoiceId: z.string(),
        transporterId: z.string().optional(),
        vehicleNo: z.string().optional(),
        distance: z.number(),
        transportMode: z.enum(['1', '2', '3', '4']).default('1'),
        vehicleType: z.enum(['R', 'O']).default('R'),
      }),
    )
    .mutation(({ input, ctx }) =>
      taxController.generateEwayBill(ctx.businessId, input),
    ),

  // GSTR previews
  getGstr1Preview: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        month: z.number().min(1).max(12),
        year: z.number(),
      }),
    )
    .query(({ input, ctx }) => taxController.getGstr1Preview(ctx.businessId, input.month, input.year)),

  getGstr3bPreview: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        month: z.number().min(1).max(12),
        year: z.number(),
      }),
    )
    .query(({ input, ctx }) => taxController.getGstr3bPreview(ctx.businessId, input.month, input.year)),
});
