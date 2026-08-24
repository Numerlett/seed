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
import {
  computeDocumentTax,
  documentTaxColumns,
  lineTaxColumns,
} from '../lib/tax';
import { toInvoicePdfData } from '../lib/pdf/invoiceData';
// Only DRAFT invoices can be cancelled and drafts are never posted, so the
// sales path never needs a reversal.
import { postJournalEntry } from '../lib/accounting/post';
import { saleInvoicePosting } from '@seed/accounting';

// =====================================================
// SALE INVOICE CONTROLLERS
// =====================================================

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

      // Fetch cost prices for COGS snapshot and HSN codes for the GST breakup
      const productIds = [...new Set(input.items.map((i) => i.productId))];
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, costPrice: true, hsnCode: true },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      // Same engine the confirmation path uses, so a draft and the invoice it
      // becomes never disagree about tax.
      const tax = await computeDocumentTax(prisma, {
        businessId: input.businessId,
        partyId: input.customerId,
        lines: input.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          discount: item.discount,
          cessRate: item.cessRate,
          hsnCode: productMap.get(item.productId)?.hsnCode,
        })),
      });
      const lineTax = lineTaxColumns(tax);

      const itemsData = input.items.map((item, index) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate ?? 0,
        discount: item.discount ?? 0,
        cessRate: item.cessRate ?? 0,
        costPrice: productMap.get(item.productId)?.costPrice ?? new Prisma.Decimal(0),
        shelfId: item.shelfId,
        batchId: item.batchId,
        ...lineTax[index],
      }));

      const invoice = await prisma.saleInvoice.create({
        data: {
          documentNumber,
          invoiceDate: input.invoiceDate ?? new Date(),
          dueDate: input.dueDate,
          notes: input.notes,
          customerId: input.customerId,
          warehouseId: input.warehouseId,
          businessId: input.businessId,
          items: { create: itemsData },
          ...documentTaxColumns(tax),
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
      const where: Prisma.SaleInvoiceWhereInput = {
        businessId: input.businessId,
        ...(input.status && { status: input.status }),
        ...(input.paymentStatus && { paymentStatus: input.paymentStatus }),
        ...(input.customerId && { customerId: input.customerId }),
        ...(input.warehouseId && { warehouseId: input.warehouseId }),
        ...(input.search && {
          OR: [
            { documentNumber: { contains: input.search, mode: 'insensitive' } },
            {
              customer: {
                name: { contains: input.search, mode: 'insensitive' },
              },
            },
          ],
        }),
        ...((input.startDate || input.endDate) && {
          invoiceDate: {
            ...(input.startDate && { gte: input.startDate }),
            ...(input.endDate && { lte: input.endDate }),
          },
        }),
      };

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

      const { items: inputItems, ...scalarFields } = input.data;

      type ScalarUpdate = Prisma.SaleInvoiceUpdateInput;

      if (inputItems) {
        const productIds = [...new Set(inputItems.map((i) => i.productId))];
        const products = await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, costPrice: true, hsnCode: true },
        });
        const productMap = new Map(products.map((p) => [p.id, p]));

        const tax = await computeDocumentTax(prisma, {
          businessId: input.businessId,
          partyId: scalarFields.customerId ?? existing.customerId,
          lines: inputItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            discount: item.discount,
            cessRate: item.cessRate,
            hsnCode: productMap.get(item.productId)?.hsnCode,
          })),
          isExport: existing.isExport,
          isSEZ: existing.isSEZ,
        });
        const lineTax = lineTaxColumns(tax);

        const itemsData = inputItems.map((item, index) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate ?? 0,
          discount: item.discount ?? 0,
          cessRate: item.cessRate ?? 0,
          costPrice: productMap.get(item.productId)?.costPrice ?? new Prisma.Decimal(0),
          shelfId: item.shelfId,
          batchId: item.batchId,
          ...lineTax[index],
        }));

        const computedTotals: ScalarUpdate = {
          ...scalarFields,
          ...documentTaxColumns(tax),
        };

        await prisma.saleInvoiceItem.deleteMany({
          where: { saleInvoiceId: input.id },
        });

        const invoice = await prisma.saleInvoice.update({
          where: { id: input.id },
          data: {
            ...computedTotals,
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
        data: scalarFields as ScalarUpdate,
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
                  hsnCode: true,
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
        // Freeze the GST breakup at confirmation: this is the point the invoice
        // becomes the document the GSTR returns are built from.
        const tax = await computeDocumentTax(tx, {
          businessId: input.businessId,
          partyId: invoice.customerId,
          lines: invoice.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            discount: item.discount,
            cessRate: item.cessRate,
            hsnCode: item.product.hsnCode,
          })),
          isExport: invoice.isExport,
          isSEZ: invoice.isSEZ,
        });
        const lineTax = lineTaxColumns(tax);

        for (const [index, item] of invoice.items.entries()) {
          // Validate stock availability (will throw if insufficient and allowNegative=false)
          await validateStockAvailability(tx, {
            productId: item.productId,
            warehouseId: invoice.warehouseId,
            shelfId: item.shelfId,
            batchId: item.batchId,
            requiredQuantity: item.quantity,
            productName: item.product.name,
          });

          // Snapshot the costPrice for COGS, plus this line's GST breakup
          await tx.saleInvoiceItem.update({
            where: { id: item.id },
            data: {
              costPrice: item.product.costPrice,
              ...lineTax[index],
            },
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

        // Books and documents commit together: a posting failure rolls the
        // confirmation back rather than letting the ledger drift silently.
        await postJournalEntry(tx, {
          businessId: input.businessId,
          source: 'SALE_INVOICE',
          sourceId: invoice.id,
          date: invoice.invoiceDate,
          narration: `Sale Invoice ${invoice.documentNumber}`,
          postedBy: ctx.userId,
          lines: saleInvoicePosting({
            partyId: invoice.customerId,
            taxableAmount: tax.totalTaxable.toFixed(2),
            tax: {
              cgst: tax.totalCgst.toFixed(2),
              sgst: tax.totalSgst.toFixed(2),
              igst: tax.totalIgst.toFixed(2),
              cess: tax.totalCess.toFixed(2),
            },
            grandTotal: tax.grandTotal.toFixed(2),
          }),
        });

        return tx.saleInvoice.update({
          where: { id: input.id },
          data: { status: 'CONFIRMED', ...documentTaxColumns(tax) },
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

/**
 * Render a confirmed invoice as a PDF.
 *
 * Returns base64 rather than a stream because tRPC carries JSON; the client
 * decodes it into a Blob to download. Only confirmed invoices can be rendered —
 * a draft has no finalised GST breakup to print.
 */
export const getSaleInvoicePdf = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .query(async ({ input, ctx }) => {
    try {
      const invoice = await prisma.saleInvoice.findFirst({
        where: { id: input.id, businessId: input.businessId },
        include: {
          items: { include: { product: true } },
          customer: { include: { addresses: true } },
          business: { include: { gstRegistration: true } },
        },
      });

      if (!invoice) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Sale invoice not found',
        });
      }

      if (invoice.status === 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Confirm the invoice before downloading it as a PDF',
        });
      }

      // Imported lazily: @react-pdf/renderer pulls in a large dependency tree
      // that should not load on every server boot.
      const { generateInvoicePdf } = await import('@seed/pdf');
      const buffer = await generateInvoicePdf(toInvoicePdfData(invoice));

      return {
        filename: `${invoice.documentNumber}.pdf`,
        mimeType: 'application/pdf',
        base64: buffer.toString('base64'),
      };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'generate invoice PDF',
        userId: ctx.userId,
      });
    }
  });
