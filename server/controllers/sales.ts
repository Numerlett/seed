import { prisma } from '@seed/database';
import { Prisma } from '@seed/database/generated/client';
import { businessMemberProcedure } from '../trpc/procedures';
import * as z from 'zod';
import { TRPCError } from '@trpc/server';
import { saleInvoiceSchema, saleInvoiceUpdateSchema } from '@seed/schemas';
import { handleControllerError } from '../helpers/controllerErrorHandler';
import {
  generateDocumentNumber,
  DOC_PREFIXES,
} from '../helpers/documentNumber';
import {
  createLedgerEntry,
  validateStockAvailability,
} from '../helpers/inventoryLedger';

// =====================================================
// SALE INVOICE CONTROLLERS
// =====================================================

function computeItemTotal(
  quantity: number,
  unitPrice: number,
  taxRate: number,
  discount: number,
) {
  const subtotal = quantity * unitPrice;
  const discountAmt = subtotal * (discount / 100);
  const afterDiscount = subtotal - discountAmt;
  const taxAmt = afterDiscount * (taxRate / 100);
  return {
    totalPrice: afterDiscount + taxAmt,
    taxAmt,
    discountAmt,
  };
}

/**
 * Create a new Sale Invoice (DRAFT).
 */
export const createSaleInvoice = businessMemberProcedure
  .input(saleInvoiceSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const documentNumber = await generateDocumentNumber(
        input.businessId,
        DOC_PREFIXES.SALE_INVOICE,
        input.documentNumber,
      );

      let totalAmount = 0;
      let taxAmount = 0;
      let discountAmount = 0;

      // Fetch cost prices for COGS snapshot
      const productIds = [...new Set(input.items.map((i) => i.productId))];
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, costPrice: true },
      });
      const costMap = new Map(products.map((p) => [p.id, p.costPrice]));

      const itemsData = input.items.map((item) => {
        const computed = computeItemTotal(
          item.quantity,
          item.unitPrice,
          item.taxRate ?? 0,
          item.discount ?? 0,
        );
        totalAmount += item.quantity * item.unitPrice;
        taxAmount += computed.taxAmt;
        discountAmount += computed.discountAmt;

        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate ?? 0,
          discount: item.discount ?? 0,
          totalPrice: computed.totalPrice,
          costPrice: costMap.get(item.productId) ?? new Prisma.Decimal(0),
          shelfId: item.shelfId,
          batchId: item.batchId,
        };
      });

      const grandTotal = totalAmount - discountAmount + taxAmount;

      const invoice = await prisma.saleInvoice.create({
        data: {
          documentNumber,
          invoiceDate: input.invoiceDate ?? new Date(),
          dueDate: input.dueDate,
          notes: input.notes,
          totalAmount,
          taxAmount,
          discountAmount,
          grandTotal,
          customerId: input.customerId,
          warehouseId: input.warehouseId,
          businessId: input.businessId,
          items: { create: itemsData },
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
          customer: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true } },
        },
      });

      return invoice;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'create sale invoice',
        userId: ctx.userId,
        fallbackMessage:
          'Could not create invoice. Document number may be in use.',
      });
    }
  });

/**
 * List sale invoices for a business.
 */
export const getSaleInvoices = businessMemberProcedure
  .input(
    z.object({
      businessId: z.string(),
      status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']).optional(),
      paymentStatus: z.enum(['UNPAID', 'PARTIAL', 'PAID']).optional(),
      customerId: z.string().optional(),
      warehouseId: z.string().optional(),
      search: z.string().optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      pageSize: z.number().int().min(1).max(100).default(20),
      pageNumber: z.number().int().min(1).default(1),
    }),
  )
  .query(async ({ input, ctx }) => {
    try {
      const where: any = { businessId: input.businessId };

      if (input.status) where.status = input.status;
      if (input.paymentStatus) where.paymentStatus = input.paymentStatus;
      if (input.customerId) where.customerId = input.customerId;
      if (input.warehouseId) where.warehouseId = input.warehouseId;
      if (input.search) {
        where.OR = [
          { documentNumber: { contains: input.search, mode: 'insensitive' } },
          {
            customer: { name: { contains: input.search, mode: 'insensitive' } },
          },
        ];
      }
      if (input.startDate || input.endDate) {
        where.invoiceDate = {};
        if (input.startDate) where.invoiceDate.gte = input.startDate;
        if (input.endDate) where.invoiceDate.lte = input.endDate;
      }

      const [data, total] = await prisma.$transaction([
        prisma.saleInvoice.findMany({
          where,
          include: {
            customer: { select: { id: true, name: true } },
            warehouse: { select: { id: true, name: true } },
            _count: { select: { items: true, salesReturns: true } },
          },
          orderBy: [{ invoiceDate: 'desc' }, { id: 'asc' }],
          skip: (input.pageNumber - 1) * input.pageSize,
          take: input.pageSize,
        }),
        prisma.saleInvoice.count({ where }),
      ]);

      return {
        data,
        pagination: {
          total,
          pageSize: input.pageSize,
          pageNumber: input.pageNumber,
          totalPages: Math.ceil(total / input.pageSize),
        },
      };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'fetch sale invoices',
        userId: ctx.userId,
      });
    }
  });

/**
 * Get a single sale invoice with full details.
 */
export const getSaleInvoiceById = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .query(async ({ input, ctx }) => {
    try {
      const invoice = await prisma.saleInvoice.findFirst({
        where: { id: input.id, businessId: input.businessId },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true, unit: true },
              },
              shelf: { select: { id: true, shelfCode: true } },
              batch: {
                select: { id: true, batchNumber: true, expiryDate: true },
              },
            },
          },
          customer: {
            select: { id: true, name: true, email: true, phone: true },
          },
          warehouse: { select: { id: true, name: true } },
          salesReturns: {
            select: {
              id: true,
              documentNumber: true,
              status: true,
              returnDate: true,
            },
          },
        },
      });

      if (!invoice) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Sale invoice not found',
        });
      }

      return invoice;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'fetch sale invoice',
        userId: ctx.userId,
      });
    }
  });

/**
 * Update a DRAFT sale invoice.
 */
export const updateSaleInvoice = businessMemberProcedure
  .input(
    z.object({
      id: z.string(),
      businessId: z.string(),
      data: saleInvoiceUpdateSchema,
    }),
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const existing = await prisma.saleInvoice.findFirst({
        where: { id: input.id, businessId: input.businessId },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Sale invoice not found',
        });
      }

      if (existing.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only DRAFT invoices can be edited',
        });
      }

      const updateData: any = { ...input.data };

      if (input.data.items) {
        let totalAmount = 0;
        let taxAmount = 0;
        let discountAmount = 0;

        const productIds = [
          ...new Set(input.data.items.map((i) => i.productId)),
        ];
        const products = await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, costPrice: true },
        });
        const costMap = new Map(products.map((p) => [p.id, p.costPrice]));

        const itemsData = input.data.items.map((item) => {
          const computed = computeItemTotal(
            item.quantity,
            item.unitPrice,
            item.taxRate ?? 0,
            item.discount ?? 0,
          );
          totalAmount += item.quantity * item.unitPrice;
          taxAmount += computed.taxAmt;
          discountAmount += computed.discountAmt;

          return {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate ?? 0,
            discount: item.discount ?? 0,
            totalPrice: computed.totalPrice,
            costPrice: costMap.get(item.productId) ?? new Prisma.Decimal(0),
            shelfId: item.shelfId,
            batchId: item.batchId,
          };
        });

        updateData.totalAmount = totalAmount;
        updateData.taxAmount = taxAmount;
        updateData.discountAmount = discountAmount;
        updateData.grandTotal = totalAmount - discountAmount + taxAmount;
        delete updateData.items;

        await prisma.saleInvoiceItem.deleteMany({
          where: { saleInvoiceId: input.id },
        });

        const invoice = await prisma.saleInvoice.update({
          where: { id: input.id },
          data: {
            ...updateData,
            items: { create: itemsData },
          },
          include: {
            items: {
              include: {
                product: { select: { id: true, name: true, sku: true } },
              },
            },
            customer: { select: { id: true, name: true } },
            warehouse: { select: { id: true, name: true } },
          },
        });

        return invoice;
      }

      const invoice = await prisma.saleInvoice.update({
        where: { id: input.id },
        data: updateData,
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
          customer: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true } },
        },
      });

      return invoice;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'update sale invoice',
        userId: ctx.userId,
      });
    }
  });

/**
 * Confirm a sale invoice — THE KEY OPERATION.
 *
 * On confirmation:
 * 1. Validate stock availability for each line item
 * 2. Snapshot costPrice on each item for COGS calculation
 * 3. Create SALE_OUT ledger entries
 * 4. Stock summaries & product cache updated via ledger engine
 */
export const confirmSaleInvoice = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    try {
      const invoice = await prisma.saleInvoice.findFirst({
        where: { id: input.id, businessId: input.businessId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  costPrice: true,
                  allowNegative: true,
                },
              },
            },
          },
        },
      });

      if (!invoice) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Sale invoice not found',
        });
      }

      if (invoice.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot confirm an invoice with status "${invoice.status}"`,
        });
      }

      const confirmed = await prisma.$transaction(async (tx) => {
        for (const item of invoice.items) {
          // Validate stock availability (will throw if insufficient and allowNegative=false)
          await validateStockAvailability(tx, {
            productId: item.productId,
            warehouseId: invoice.warehouseId,
            shelfId: item.shelfId,
            batchId: item.batchId,
            requiredQuantity: item.quantity,
            productName: item.product.name,
          });

          // Snapshot the current costPrice on the item for COGS
          await tx.saleInvoiceItem.update({
            where: { id: item.id },
            data: { costPrice: item.product.costPrice },
          });

          // Create SALE_OUT ledger entry
          await createLedgerEntry(tx, {
            transactionType: 'SALE_OUT',
            productId: item.productId,
            warehouseId: invoice.warehouseId,
            shelfId: item.shelfId,
            batchId: item.batchId,
            businessId: input.businessId,
            quantity: item.quantity,
            unitCost: item.product.costPrice,
            referenceTable: 'sale_invoices',
            referenceId: invoice.id,
            transactionDate: invoice.invoiceDate,
            notes: `Invoice ${invoice.documentNumber} - ${item.product.name}`,
          });
        }

        return tx.saleInvoice.update({
          where: { id: input.id },
          data: { status: 'CONFIRMED' },
          include: {
            items: {
              include: {
                product: { select: { id: true, name: true, sku: true } },
              },
            },
            customer: { select: { id: true, name: true } },
            warehouse: { select: { id: true, name: true } },
          },
        });
      });

      return confirmed;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'confirm sale invoice',
        userId: ctx.userId,
      });
    }
  });

/**
 * Cancel a sale invoice. Only DRAFT invoices can be cancelled.
 */
export const cancelSaleInvoice = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    try {
      const invoice = await prisma.saleInvoice.findFirst({
        where: { id: input.id, businessId: input.businessId },
      });

      if (!invoice) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Sale invoice not found',
        });
      }

      if (invoice.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only DRAFT invoices can be cancelled',
        });
      }

      const cancelled = await prisma.saleInvoice.update({
        where: { id: input.id },
        data: { status: 'CANCELLED' },
      });

      return cancelled;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'cancel sale invoice',
        userId: ctx.userId,
      });
    }
  });

/**
 * Delete a DRAFT sale invoice.
 */
export const deleteSaleInvoice = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    try {
      const invoice = await prisma.saleInvoice.findFirst({
        where: { id: input.id, businessId: input.businessId },
      });

      if (!invoice) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Sale invoice not found',
        });
      }

      if (invoice.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only DRAFT invoices can be deleted',
        });
      }

      await prisma.saleInvoice.delete({ where: { id: input.id } });
      return { success: true };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'delete sale invoice',
        userId: ctx.userId,
      });
    }
  });

/**
 * Update payment status of a CONFIRMED invoice.
 */
export const updatePaymentStatus = businessMemberProcedure
  .input(
    z.object({
      id: z.string(),
      businessId: z.string(),
      paymentStatus: z.enum(['UNPAID', 'PARTIAL', 'PAID']),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const invoice = await prisma.saleInvoice.findFirst({
        where: { id: input.id, businessId: input.businessId },
      });

      if (!invoice) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Sale invoice not found',
        });
      }

      if (invoice.status !== 'CONFIRMED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Can only update payment status of confirmed invoices',
        });
      }

      const updated = await prisma.saleInvoice.update({
        where: { id: input.id },
        data: { paymentStatus: input.paymentStatus },
      });

      return updated;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'update payment status',
        userId: ctx.userId,
      });
    }
  });
