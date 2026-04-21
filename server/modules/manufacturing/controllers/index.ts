import { prisma } from '@seed/database';
import { TRPCError } from '@trpc/server';

export async function getBoms(businessId: string, input: { page: number; limit: number }) {
  const skip = (input.page - 1) * input.limit;
  const [items, total] = await Promise.all([
    prisma.billOfMaterials.findMany({
      where: { businessId },
      skip,
      take: input.limit,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { name: true, sku: true } },
        components: { include: { component: { select: { name: true, sku: true } } } },
      },
    }),
    prisma.billOfMaterials.count({ where: { businessId } }),
  ]);
  return { items, total, page: input.page };
}

export async function createBom(
  businessId: string,
  input: {
    productId: string;
    version: number;
    yieldQuantity: number;
    components: Array<{ componentProductId: string; quantity: number; unit?: string; scrapPercent?: number }>;
  },
) {
  const existing = await prisma.billOfMaterials.findFirst({
    where: { businessId, productId: input.productId, version: input.version, isActive: true },
  });
  if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Active BOM for this product+version already exists' });

  return prisma.billOfMaterials.create({
    data: {
      businessId,
      productId: input.productId,
      version: input.version,
      yieldQuantity: input.yieldQuantity,
      isActive: true,
      components: {
        create: input.components.map((c) => ({
          componentProductId: c.componentProductId,
          quantity: c.quantity,
          unit: c.unit,
          scrapPercent: c.scrapPercent ?? 0,
        })),
      },
    },
    include: { components: true },
  });
}

export async function getWorkOrders(businessId: string, input: { page: number; limit: number; status?: string }) {
  const skip = (input.page - 1) * input.limit;
  const where = { businessId, ...(input.status ? { status: input.status as any } : {}) };
  const [items, total] = await Promise.all([
    prisma.workOrder.findMany({
      where,
      skip,
      take: input.limit,
      orderBy: { createdAt: 'desc' },
      include: {
        bom: { include: { product: { select: { name: true } } } },
      },
    }),
    prisma.workOrder.count({ where }),
  ]);
  return { items, total, page: input.page };
}

export async function createWorkOrder(
  businessId: string,
  input: {
    bomId: string;
    plannedQuantity: number;
    startDate: Date;
    endDate?: Date;
    warehouseId: string;
    notes?: string;
  },
) {
  const bom = await prisma.billOfMaterials.findFirst({ where: { id: input.bomId, businessId } });
  if (!bom) throw new TRPCError({ code: 'NOT_FOUND', message: 'BOM not found' });

  const count = await prisma.workOrder.count({ where: { businessId } });
  const docNumber = `WO-${String(count + 1).padStart(4, '0')}`;

  return prisma.workOrder.create({
    data: {
      businessId,
      documentNumber: docNumber,
      bomId: input.bomId,
      plannedQuantity: input.plannedQuantity,
      startDate: input.startDate,
      endDate: input.endDate,
      warehouseId: input.warehouseId,
      notes: input.notes,
      status: 'DRAFT',
    },
  });
}

export async function updateWorkOrderStatus(
  businessId: string,
  workOrderId: string,
  status: string,
) {
  const wo = await prisma.workOrder.findFirst({ where: { id: workOrderId, businessId } });
  if (!wo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Work order not found' });

  return prisma.workOrder.update({
    where: { id: workOrderId },
    data: { status: status as any },
  });
}
