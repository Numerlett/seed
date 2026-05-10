import { prisma } from '@seed/database';
import { TRPCError } from '@trpc/server';

type MessageType =
  | 'INVOICE'
  | 'PAYMENT_REMINDER'
  | 'PAYMENT_RECEIVED'
  | 'GRN_RECEIVED'
  | 'LOW_STOCK'
  | 'OTP'
  | 'WELCOME'
  | 'CUSTOM';

type MessageChannel = 'EMAIL' | 'SMS' | 'WHATSAPP';
type MessageStatus = 'PENDING' | 'SENT' | 'FAILED' | 'DELIVERED';

/**
 * Extract `{{variable}}` placeholders from a template body.
 * Returns the unique list of variable names in order of first appearance.
 */
function extractVariables(body: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const re = /\{\{\s*(\w+)\s*\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    if (!seen.has(match[1])) {
      seen.add(match[1]);
      out.push(match[1]);
    }
  }
  return out;
}

/**
 * Substitute `{{variable}}` placeholders in a body with values from a context.
 * Unknown variables are replaced with an empty string.
 */
function renderTemplate(body: string, ctx: Record<string, string | number>): string {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const v = ctx[key];
    return v === undefined || v === null ? '' : String(v);
  });
}

// ---------- Templates ----------

export async function getMessageTemplates(
  businessId: string,
  filters: { type?: MessageType; channel?: MessageChannel; isActive?: boolean },
) {
  return prisma.messageTemplate.findMany({
    where: {
      OR: [{ businessId }, { businessId: null }],
      ...(filters.type && { type: filters.type }),
      ...(filters.channel && { channel: filters.channel }),
      ...(filters.isActive !== undefined && { isActive: filters.isActive }),
    },
    orderBy: [{ isDefault: 'desc' }, { type: 'asc' }, { name: 'asc' }],
  });
}

export async function getMessageTemplateById(businessId: string, id: string) {
  const template = await prisma.messageTemplate.findFirst({
    where: { id, OR: [{ businessId }, { businessId: null }] },
  });
  if (!template) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Template not found' });
  }
  return template;
}

export async function createMessageTemplate(
  businessId: string,
  input: {
    type: MessageType;
    channel: MessageChannel;
    name: string;
    subject?: string;
    body: string;
    isDefault?: boolean;
  },
) {
  return prisma.messageTemplate.create({
    data: {
      businessId,
      type: input.type,
      channel: input.channel,
      name: input.name,
      subject: input.subject,
      body: input.body,
      variables: extractVariables(input.body),
      isDefault: input.isDefault ?? false,
    },
  });
}

export async function updateMessageTemplate(
  businessId: string,
  id: string,
  input: {
    name?: string;
    subject?: string;
    body?: string;
    isActive?: boolean;
    isDefault?: boolean;
  },
) {
  const existing = await prisma.messageTemplate.findFirst({
    where: { id, businessId },
  });
  if (!existing) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Template not found or owned by another business',
    });
  }

  return prisma.messageTemplate.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.subject !== undefined && { subject: input.subject }),
      ...(input.body !== undefined && {
        body: input.body,
        variables: extractVariables(input.body),
      }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
    },
  });
}

export async function deleteMessageTemplate(businessId: string, id: string) {
  const existing = await prisma.messageTemplate.findFirst({
    where: { id, businessId },
  });
  if (!existing) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Template not found or owned by another business',
    });
  }
  await prisma.messageTemplate.delete({ where: { id } });
  return { success: true };
}

// ---------- Logs ----------

export async function getMessageLogs(
  businessId: string,
  input: {
    page: number;
    limit: number;
    channel?: MessageChannel;
    status?: MessageStatus;
    partyId?: string;
  },
) {
  const skip = (input.page - 1) * input.limit;
  const where = {
    businessId,
    ...(input.channel && { channel: input.channel }),
    ...(input.status && { status: input.status }),
    ...(input.partyId && { partyId: input.partyId }),
  };

  const [items, total] = await Promise.all([
    prisma.messageLog.findMany({
      where,
      skip,
      take: input.limit,
      orderBy: { createdAt: 'desc' },
      include: { template: { select: { name: true, type: true } } },
    }),
    prisma.messageLog.count({ where }),
  ]);

  return { items, total, page: input.page };
}

/**
 * Record a message to the log. Actual delivery is the responsibility of the
 * worker that dequeues the corresponding BullMQ job — this function just persists
 * the intent and rendered body.
 */
export async function logMessage(
  businessId: string,
  input: {
    templateId?: string;
    channel: MessageChannel;
    to: string;
    subject?: string;
    body: string;
    partyId?: string;
    referenceId?: string;
  },
) {
  return prisma.messageLog.create({
    data: {
      businessId,
      templateId: input.templateId,
      channel: input.channel,
      to: input.to,
      subject: input.subject,
      body: input.body,
      partyId: input.partyId,
      referenceId: input.referenceId,
      status: 'PENDING',
    },
  });
}

/**
 * Render a template by id with the provided variables, then enqueue a log entry.
 * Returns the log id and rendered body so callers can preview before sending.
 */
export async function renderAndLog(
  businessId: string,
  input: {
    templateId: string;
    to: string;
    variables: Record<string, string | number>;
    partyId?: string;
    referenceId?: string;
  },
) {
  const template = await getMessageTemplateById(businessId, input.templateId);
  const renderedBody = renderTemplate(template.body, input.variables);
  const renderedSubject = template.subject
    ? renderTemplate(template.subject, input.variables)
    : undefined;

  const log = await logMessage(businessId, {
    templateId: template.id,
    channel: template.channel,
    to: input.to,
    subject: renderedSubject,
    body: renderedBody,
    partyId: input.partyId,
    referenceId: input.referenceId,
  });

  return { logId: log.id, body: renderedBody, subject: renderedSubject };
}

// ---------- Preferences ----------

export async function getNotificationPreferences(userId: string) {
  let pref = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  if (!pref) {
    pref = await prisma.notificationPreference.create({
      data: { userId },
    });
  }

  return pref;
}

export async function upsertNotificationPreferences(
  userId: string,
  input: {
    emailEnabled?: boolean;
    smsEnabled?: boolean;
    whatsappEnabled?: boolean;
    lowStockAlerts?: boolean;
    paymentReminders?: boolean;
  },
) {
  return prisma.notificationPreference.upsert({
    where: { userId },
    update: input,
    create: { userId, ...input },
  });
}
