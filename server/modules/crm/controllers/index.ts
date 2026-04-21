import { prisma } from '@seed/database';
import { TRPCError } from '@trpc/server';

export async function getLeads(
  businessId: string,
  input: { page: number; limit: number; stage?: string },
) {
  const skip = (input.page - 1) * input.limit;
  const where = { businessId, ...(input.stage ? { stage: input.stage as any } : {}) };
  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      skip,
      take: input.limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.lead.count({ where }),
  ]);
  return { items, total, page: input.page };
}

export async function createLead(
  businessId: string,
  input: {
    name: string;
    phone?: string;
    email?: string;
    source?: string;
    stage?: string;
    value?: number;
    notes?: string;
    ownerId?: string;
  },
) {
  return prisma.lead.create({
    data: {
      businessId,
      name: input.name,
      phone: input.phone,
      email: input.email,
      source: (input.source ?? 'OTHER') as any,
      stage: (input.stage ?? 'NEW') as any,
      value: input.value,
      notes: input.notes,
      ownerId: input.ownerId,
    },
  });
}

export async function updateLeadStage(businessId: string, leadId: string, stage: string) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, businessId } });
  if (!lead) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });
  return prisma.lead.update({ where: { id: leadId }, data: { stage: stage as any } });
}

export async function getActivities(
  businessId: string,
  input: { page: number; limit: number; partyId?: string; leadId?: string },
) {
  const skip = (input.page - 1) * input.limit;
  const where = {
    businessId,
    ...(input.partyId ? { partyId: input.partyId } : {}),
    ...(input.leadId ? { leadId: input.leadId } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      skip,
      take: input.limit,
      orderBy: { scheduledAt: 'desc' },
    }),
    prisma.activity.count({ where }),
  ]);
  return { items, total };
}

export async function createActivity(
  businessId: string,
  input: {
    type: string;
    partyId?: string;
    leadId?: string;
    scheduledAt: Date;
    notes?: string;
    assignedToId?: string;
  },
) {
  return prisma.activity.create({
    data: {
      businessId,
      type: input.type as any,
      title: input.type,
      partyId: input.partyId,
      leadId: input.leadId,
      scheduledAt: input.scheduledAt,
      notes: input.notes,
      assigneeId: input.assignedToId,
    },
  });
}

export async function getTasks(
  businessId: string,
  input: { page: number; limit: number; assigneeId?: string; status?: string },
) {
  const skip = (input.page - 1) * input.limit;
  const where = {
    businessId,
    ...(input.assigneeId ? { assigneeId: input.assigneeId } : {}),
    ...(input.status ? { status: input.status as any } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.task.findMany({ where, skip, take: input.limit, orderBy: { dueAt: 'asc' } }),
    prisma.task.count({ where }),
  ]);
  return { items, total };
}

export async function createTask(
  businessId: string,
  input: {
    title: string;
    dueAt?: Date;
    assigneeId?: string;
    priority?: string;
    relatedLeadId?: string;
    relatedPartyId?: string;
  },
) {
  return prisma.task.create({
    data: {
      businessId,
      title: input.title,
      dueAt: input.dueAt,
      assigneeId: input.assigneeId,
      priority: (input.priority ?? 'MEDIUM') as any,
      status: 'PENDING',
      leadId: input.relatedLeadId,
      partyId: input.relatedPartyId,
    },
  });
}
