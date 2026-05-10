import { t } from '../../../trpc';
import {
  businessMemberProcedure,
  protectedProcedure,
} from '../../../trpc/procedures';
import { z } from 'zod';
import * as ctrl from '../controllers/index';

const messageTypeSchema = z.enum([
  'INVOICE',
  'PAYMENT_REMINDER',
  'PAYMENT_RECEIVED',
  'GRN_RECEIVED',
  'LOW_STOCK',
  'OTP',
  'WELCOME',
  'CUSTOM',
]);

const messageChannelSchema = z.enum(['EMAIL', 'SMS', 'WHATSAPP']);
const messageStatusSchema = z.enum(['PENDING', 'SENT', 'FAILED', 'DELIVERED']);

export const communicationsRoutes = t.router({
  // ---------- Templates ----------
  getTemplates: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        type: messageTypeSchema.optional(),
        channel: messageChannelSchema.optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .query(({ input, ctx }) =>
      ctrl.getMessageTemplates(ctx.businessId, {
        type: input.type,
        channel: input.channel,
        isActive: input.isActive,
      }),
    ),

  getTemplateById: businessMemberProcedure
    .input(z.object({ businessId: z.string(), id: z.string() }))
    .query(({ input, ctx }) => ctrl.getMessageTemplateById(ctx.businessId, input.id)),

  createTemplate: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        type: messageTypeSchema,
        channel: messageChannelSchema,
        name: z.string().min(1).max(100),
        subject: z.string().max(200).optional(),
        body: z.string().min(1),
        isDefault: z.boolean().optional(),
      }),
    )
    .mutation(({ input, ctx }) =>
      ctrl.createMessageTemplate(ctx.businessId, {
        type: input.type,
        channel: input.channel,
        name: input.name,
        subject: input.subject,
        body: input.body,
        isDefault: input.isDefault,
      }),
    ),

  updateTemplate: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        subject: z.string().max(200).optional(),
        body: z.string().min(1).optional(),
        isActive: z.boolean().optional(),
        isDefault: z.boolean().optional(),
      }),
    )
    .mutation(({ input, ctx }) =>
      ctrl.updateMessageTemplate(ctx.businessId, input.id, {
        name: input.name,
        subject: input.subject,
        body: input.body,
        isActive: input.isActive,
        isDefault: input.isDefault,
      }),
    ),

  deleteTemplate: businessMemberProcedure
    .input(z.object({ businessId: z.string(), id: z.string() }))
    .mutation(({ input, ctx }) => ctrl.deleteMessageTemplate(ctx.businessId, input.id)),

  // ---------- Logs ----------
  getLogs: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(200).default(50),
        channel: messageChannelSchema.optional(),
        status: messageStatusSchema.optional(),
        partyId: z.string().optional(),
      }),
    )
    .query(({ input, ctx }) =>
      ctrl.getMessageLogs(ctx.businessId, {
        page: input.page,
        limit: input.limit,
        channel: input.channel,
        status: input.status,
        partyId: input.partyId,
      }),
    ),

  // ---------- Render & log (preview / send) ----------
  renderAndLog: businessMemberProcedure
    .input(
      z.object({
        businessId: z.string(),
        templateId: z.string(),
        to: z.string().min(1),
        variables: z.record(z.string(), z.union([z.string(), z.number()])),
        partyId: z.string().optional(),
        referenceId: z.string().optional(),
      }),
    )
    .mutation(({ input, ctx }) =>
      ctrl.renderAndLog(ctx.businessId, {
        templateId: input.templateId,
        to: input.to,
        variables: input.variables,
        partyId: input.partyId,
        referenceId: input.referenceId,
      }),
    ),

  // ---------- Preferences (user-scoped, no businessId) ----------
  getMyPreferences: protectedProcedure.query(({ ctx }) =>
    ctrl.getNotificationPreferences(ctx.userId),
  ),

  updateMyPreferences: protectedProcedure
    .input(
      z.object({
        emailEnabled: z.boolean().optional(),
        smsEnabled: z.boolean().optional(),
        whatsappEnabled: z.boolean().optional(),
        lowStockAlerts: z.boolean().optional(),
        paymentReminders: z.boolean().optional(),
      }),
    )
    .mutation(({ input, ctx }) =>
      ctrl.upsertNotificationPreferences(ctx.userId, input),
    ),
});
