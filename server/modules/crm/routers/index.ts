import { t } from '../../../trpc';
import { businessMemberProcedure } from '../../../trpc/procedures';
import { z } from 'zod';
import * as ctrl from '../controllers/index';

export const crmRoutes = t.router({
  getLeads: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        page: z.number().default(1),
        limit: z.number().default(20),
        stage: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']).optional(),
      }),
    )
    .query(({ input, ctx }) => ctrl.getLeads(ctx.businessId, input)),

  createLead: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        name: z.string().min(1),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        source: z.enum(['WEBSITE', 'REFERRAL', 'COLD_CALL', 'TRADE_SHOW', 'SOCIAL_MEDIA', 'OTHER']).optional(),
        stage: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']).optional(),
        value: z.number().optional(),
        notes: z.string().optional(),
        ownerId: z.string().optional(),
      }),
    )
    .mutation(({ input, ctx }) => ctrl.createLead(ctx.businessId, input)),

  updateLeadStage: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        leadId: z.string(),
        stage: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']),
      }),
    )
    .mutation(({ input, ctx }) => ctrl.updateLeadStage(ctx.businessId, input.leadId, input.stage)),

  getActivities: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        page: z.number().default(1),
        limit: z.number().default(20),
        partyId: z.string().optional(),
        leadId: z.string().optional(),
      }),
    )
    .query(({ input, ctx }) => ctrl.getActivities(ctx.businessId, input)),

  createActivity: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        type: z.enum(['CALL', 'MEETING', 'NOTE', 'EMAIL', 'WHATSAPP', 'TASK', 'OTHER']),
        partyId: z.string().optional(),
        leadId: z.string().optional(),
        scheduledAt: z.date(),
        notes: z.string().optional(),
        assignedToId: z.string().optional(),
      }),
    )
    .mutation(({ input, ctx }) => ctrl.createActivity(ctx.businessId, input)),

  getTasks: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        page: z.number().default(1),
        limit: z.number().default(20),
        assigneeId: z.string().optional(),
        status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
      }),
    )
    .query(({ input, ctx }) => ctrl.getTasks(ctx.businessId, input)),

  createTask: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        title: z.string().min(1),
        dueAt: z.date().optional(),
        assigneeId: z.string().optional(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
        relatedLeadId: z.string().optional(),
        relatedPartyId: z.string().optional(),
      }),
    )
    .mutation(({ input, ctx }) => ctrl.createTask(ctx.businessId, input)),
});
