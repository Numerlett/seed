import { prisma, Prisma } from '@seed/database';
import { businessMemberProcedure } from '../trpc/procedures';
import * as z from 'zod';
import { TRPCError } from '@trpc/server';
import { purchaseReturnSchema, salesReturnSchema } from '@seed/schemas';
import { handleControllerError } from '../helpers/controllerErrorHandler';
import { withDocumentNumber, DOC_PREFIXES } from '../helpers/documentNumber';
import {
  createLedgerEntry,
  lockProductsForUpdate,
  validateStockAvailability,
} from '../helpers/inventoryLedger';
import {
  computeReturnTax,
  documentTaxColumns,
  lineTaxColumns,
  type DbClient,
} from '../lib/tax';
import { postJournalEntry } from '../lib/accounting/post';
import {
  purchaseReturnPosting,
  purchaseReturnStockPosting,
  salesReturnPosting,
} from '@seed/accounting';

/**
 * Lines of the invoice a sales return reverses, or undefined when the return
 * is not linked to one. Used to inherit the tax that was actually charged.
 */
async function originalSaleLines(db: DbClient, saleInvoiceId?: string | null) {
  if (!saleInvoiceId) return undefined;
  return db.saleInvoiceItem.findMany({
    where: { saleInvoiceId },
    select: {
      productId: true,
      taxRate: true,
      discount: true,
      cessRate: true,
      hsnCode: true,
    },
  });
}

/**
 * Cost per product frozen on the invoice a sales return credits.
 *
 * Confirmation snapshots the weighted-average cost each line was issued at, so
 * a return can restore inventory at exactly the value the sale removed. Without
 * it the two sides of the same goods use different costs and inventory drifts
 * every time something comes back.
 */
async function originalSaleCosts(
  db: DbClient,
  saleInvoiceId?: string | null,
): Promise<Map<string, Prisma.Decimal>> {
  const costs = new Map<string, Prisma.Decimal>();
  if (!saleInvoiceId) return costs;

  const lines = await db.saleInvoiceItem.findMany({
    where: { saleInvoiceId },
    select: { productId: true, costPrice: true },
  });

  for (const line of lines) {
    if (line.costPrice !== null && line.costPrice !== undefined) {
      costs.set(line.productId, new Prisma.Decimal(line.costPrice.toString()));
    }
  }
  return costs;
}

/**
 * Lines of the purchase order behind the GRN a purchase return reverses.
 * The debit note has to reverse the input tax credit that was claimed.
 */
async function originalPurchaseLines(db: DbClient, grnId?: string | null) {
  if (!grnId) return undefined;
  const grn = await db.goodsReceiptNote.findUnique({
    where: { id: grnId },
    select: { purchaseOrderId: true },
  });
  if (!grn?.purchaseOrderId) return undefined;
  return db.purchaseOrderItem.findMany({
    where: { purchaseOrderId: grn.purchaseOrderId },
    select: {
      productId: true,
      taxRate: true,
      discount: true,
      cessRate: true,
      hsnCode: true,
    },
  });
}

// =====================================================
// PURCHASE RETURN CONTROLLERS
// =====================================================

/**
 * Create a Purchase Return (DRAFT).
 * Stock is not affected until confirmed.
 */
export const createPurchaseReturn = businessMemberProcedure
  .input(purchaseReturnSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const { tax, appliedRates } = await computeReturnTax(prisma, {
        businessId: input.businessId,
        partyId: input.supplierId,
        lines: input.items,
        originalLines: await originalPurchaseLines(prisma, input.grnId),
      });
      const lineTax = lineTaxColumns(tax);

      const itemsData = input.items.map((item, index) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        ...appliedRates[index],
        shelfId: item.shelfId,
        batchId: item.batchId,
        ...lineTax[index],
      }));

      const pr = await withDocumentNumber(
        input.businessId,
        DOC_PREFIXES.PURCHASE_RETURN,
        input.documentNumber,
        (documentNumber) =>
          prisma.purchaseReturn.create({
            data: {
              documentNumber,
              returnDate: input.returnDate ?? new Date(),
              reason: input.reason,
              notes: input.notes,
              supplierId: input.supplierId,
              grnId: input.grnId,
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
              supplier: { select: { id: true, name: true } },
              warehouse: { select: { id: true, name: true } },
            },
          }),
      );

      return pr;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'create purchase return',
        userId: ctx.userId,
      });
    }
  });

/**
 * List purchase returns.
 */
export const getPurchaseReturns = businessMemberProcedure
  .input(
    z.object({
      businessId: z.string(),
      status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']).optional(),
      supplierId: z.string().optional(),
      search: z.string().optional(),
      pageSize: z.number().int().min(1).max(100).default(20),
      pageNumber: z.number().int().min(1).default(1),
    }),
  )
  .query(async ({ input, ctx }) => {
    try {
      const where: any = { businessId: input.businessId };

      if (input.status) where.status = input.status;
      if (input.supplierId) where.supplierId = input.supplierId;
      if (input.search) {
        where.documentNumber = { contains: input.search, mode: 'insensitive' };
      }

      const [data, total] = await prisma.$transaction([
        prisma.purchaseReturn.findMany({
          where,
          include: {
            supplier: { select: { id: true, name: true } },
            warehouse: { select: { id: true, name: true } },
            grn: { select: { id: true, documentNumber: true } },
            _count: { select: { items: true } },
          },
          orderBy: [{ returnDate: 'desc' }, { id: 'asc' }],
          skip: (input.pageNumber - 1) * input.pageSize,
          take: input.pageSize,
        }),
        prisma.purchaseReturn.count({ where }),
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
        operation: 'fetch purchase returns',
        userId: ctx.userId,
      });
    }
  });

/**
 * Get a single purchase return.
 */
export const getPurchaseReturnById = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .query(async ({ input, ctx }) => {
    try {
      const pr = await prisma.purchaseReturn.findFirst({
        where: { id: input.id, businessId: input.businessId },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true, unit: true },
              },
              shelf: { select: { id: true, shelfCode: true } },
              batch: { select: { id: true, batchNumber: true } },
            },
          },
          supplier: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true } },
          grn: { select: { id: true, documentNumber: true } },
        },
      });

      if (!pr) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Purchase return not found',
        });
      }

      return pr;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'fetch purchase return',
        userId: ctx.userId,
      });
    }
  });

/**
 * Confirm a purchase return.
 *
 * Triggers PURCHASE_RETURN_OUT ledger entries — stock goes OUT (returning to supplier).
 * Validates stock availability before deducting.
 */
export const confirmPurchaseReturn = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    try {
      const pr = await prisma.purchaseReturn.findFirst({
        where: { id: input.id, businessId: input.businessId },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (!pr) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Purchase return not found',
        });
      }

      if (pr.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot confirm a purchase return with status "${pr.status}"`,
        });
      }

      const confirmed = await prisma.$transaction(async (tx) => {
        // Availability is checked and then acted on, so the products are
        // locked for the duration to stop a concurrent movement invalidating
        // the check between the two.
        await lockProductsForUpdate(
          tx,
          pr.items.map((item) => item.productId),
        );

        // Freeze the debit note at confirmation: this is what reduces the
        // input tax credit claimed on the goods going back.
        const { tax, appliedRates } = await computeReturnTax(tx, {
          businessId: input.businessId,
          partyId: pr.supplierId,
          lines: pr.items,
          originalLines: await originalPurchaseLines(tx, pr.grnId),
        });
        const lineTax = lineTaxColumns(tax);

        // Unlike every other issue path, a purchase return does not use the
        // weighted average (`resolveOutboundCost`). It reverses a specific
        // receipt, and the supplier credits the price that receipt was invoiced
        // at, so stock leaves at the price on the return line. That keeps the
        // Inventory account, the stock subledger and the debit note in
        // agreement; costing it at the average would leave a price difference
        // with nowhere to post.
        let stockRelieved = new Prisma.Decimal(0);

        for (const [index, item] of pr.items.entries()) {
          // Validate stock availability
          await validateStockAvailability(tx, {
            productId: item.productId,
            warehouseId: pr.warehouseId,
            shelfId: item.shelfId,
            batchId: item.batchId,
            requiredQuantity: item.quantity,
            productName: item.product.name,
          });

          stockRelieved = stockRelieved.plus(
            new Prisma.Decimal(item.quantity.toString()).mul(
              new Prisma.Decimal(item.unitPrice.toString()),
            ),
          );

          await createLedgerEntry(tx, {
            transactionType: 'PURCHASE_RETURN_OUT',
            productId: item.productId,
            warehouseId: pr.warehouseId,
            shelfId: item.shelfId,
            batchId: item.batchId,
            businessId: input.businessId,
            quantity: item.quantity,
            unitCost: item.unitPrice,
            referenceTable: 'purchase_returns',
            referenceId: pr.id,
            transactionDate: pr.returnDate,
            notes: `Purchase Return ${pr.documentNumber} - ${item.product.name}`,
          });

          await tx.purchaseReturnItem.update({
            where: { id: item.id },
            data: { ...appliedRates[index], ...lineTax[index] },
          });
        }

        await postJournalEntry(tx, {
          businessId: input.businessId,
          source: 'PURCHASE_RETURN',
          sourceId: pr.id,
          date: pr.returnDate,
          narration: `Purchase Return ${pr.documentNumber}`,
          postedBy: ctx.userId,
          lines: [
            // Supplier leg: reduces the payable and the input tax credit.
            ...purchaseReturnPosting({
              partyId: pr.supplierId,
              taxableAmount: tax.totalTaxable.toFixed(2),
              tax: {
                cgst: tax.totalCgst.toFixed(2),
                sgst: tax.totalSgst.toFixed(2),
                igst: tax.totalIgst.toFixed(2),
                cess: tax.totalCess.toFixed(2),
              },
              grandTotal: tax.grandTotal.toFixed(2),
            }),
            // Stock leg: the goods have left, so Inventory must say so. The
            // supplier leg alone credited GR/IR and left Inventory overstated.
            ...purchaseReturnStockPosting({
              partyId: pr.supplierId,
              inventoryValue: stockRelieved.toFixed(2),
            }),
          ],
        });

        return tx.purchaseReturn.update({
          where: { id: input.id },
          data: { status: 'CONFIRMED', ...documentTaxColumns(tax) },
          include: {
            items: {
              include: {
                product: { select: { id: true, name: true, sku: true } },
              },
            },
            supplier: { select: { id: true, name: true } },
          },
        });
      });

      return confirmed;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'confirm purchase return',
        userId: ctx.userId,
      });
    }
  });

/**
 * Cancel a DRAFT purchase return.
 */
export const cancelPurchaseReturn = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    try {
      const pr = await prisma.purchaseReturn.findFirst({
        where: { id: input.id, businessId: input.businessId },
      });

      if (!pr) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Purchase return not found',
        });
      }

      if (pr.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only DRAFT purchase returns can be cancelled',
        });
      }

      return prisma.purchaseReturn.update({
        where: { id: input.id },
        data: { status: 'CANCELLED' },
      });
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'cancel purchase return',
        userId: ctx.userId,
      });
    }
  });

// =====================================================
// SALES RETURN CONTROLLERS
// =====================================================

/**
 * Create a Sales Return (DRAFT).
 * Stock is not affected until confirmed.
 */
export const createSalesReturn = businessMemberProcedure
  .input(salesReturnSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const { tax, appliedRates } = await computeReturnTax(prisma, {
        businessId: input.businessId,
        partyId: input.customerId,
        lines: input.items,
        originalLines: await originalSaleLines(prisma, input.saleInvoiceId),
      });
      const lineTax = lineTaxColumns(tax);

      const itemsData = input.items.map((item, index) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        ...appliedRates[index],
        shelfId: item.shelfId,
        batchId: item.batchId,
        ...lineTax[index],
      }));

      const sr = await withDocumentNumber(
        input.businessId,
        DOC_PREFIXES.SALES_RETURN,
        input.documentNumber,
        (documentNumber) =>
          prisma.salesReturn.create({
            data: {
              documentNumber,
              returnDate: input.returnDate ?? new Date(),
              reason: input.reason,
              notes: input.notes,
              customerId: input.customerId,
              saleInvoiceId: input.saleInvoiceId,
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
          }),
      );

      return sr;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'create sales return',
        userId: ctx.userId,
      });
    }
  });

/**
 * List sales returns.
 */
export const getSalesReturns = businessMemberProcedure
  .input(
    z.object({
      businessId: z.string(),
      status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']).optional(),
      customerId: z.string().optional(),
      search: z.string().optional(),
      pageSize: z.number().int().min(1).max(100).default(20),
      pageNumber: z.number().int().min(1).default(1),
    }),
  )
  .query(async ({ input, ctx }) => {
    try {
      const where: any = { businessId: input.businessId };

      if (input.status) where.status = input.status;
      if (input.customerId) where.customerId = input.customerId;
      if (input.search) {
        where.documentNumber = { contains: input.search, mode: 'insensitive' };
      }

      const [data, total] = await prisma.$transaction([
        prisma.salesReturn.findMany({
          where,
          include: {
            customer: { select: { id: true, name: true } },
            warehouse: { select: { id: true, name: true } },
            saleInvoice: { select: { id: true, documentNumber: true } },
            _count: { select: { items: true } },
          },
          orderBy: [{ returnDate: 'desc' }, { id: 'asc' }],
          skip: (input.pageNumber - 1) * input.pageSize,
          take: input.pageSize,
        }),
        prisma.salesReturn.count({ where }),
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
        operation: 'fetch sales returns',
        userId: ctx.userId,
      });
    }
  });

/**
 * Get a single sales return.
 */
export const getSalesReturnById = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .query(async ({ input, ctx }) => {
    try {
      const sr = await prisma.salesReturn.findFirst({
        where: { id: input.id, businessId: input.businessId },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true, unit: true },
              },
              shelf: { select: { id: true, shelfCode: true } },
              batch: { select: { id: true, batchNumber: true } },
            },
          },
          customer: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true } },
          saleInvoice: { select: { id: true, documentNumber: true } },
        },
      });

      if (!sr) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Sales return not found',
        });
      }

      return sr;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'fetch sales return',
        userId: ctx.userId,
      });
    }
  });

/**
 * Confirm a sales return.
 *
 * Triggers SALES_RETURN_IN ledger entries — stock comes back IN.
 */
export const confirmSalesReturn = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    try {
      const sr = await prisma.salesReturn.findFirst({
        where: { id: input.id, businessId: input.businessId },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, costPrice: true } },
            },
          },
        },
      });

      if (!sr) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Sales return not found',
        });
      }

      if (sr.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot confirm a sales return with status "${sr.status}"`,
        });
      }

      const confirmed = await prisma.$transaction(async (tx) => {
        await lockProductsForUpdate(
          tx,
          sr.items.map((item) => item.productId),
        );

        // Freeze the credit note at confirmation, mirroring the invoice path:
        // this is the figure that reduces outward liability in GSTR-3B.
        const { tax, appliedRates } = await computeReturnTax(tx, {
          businessId: input.businessId,
          partyId: sr.customerId,
          lines: sr.items,
          originalLines: await originalSaleLines(tx, sr.saleInvoiceId),
        });
        const lineTax = lineTaxColumns(tax);

        // What each product cost when it left, taken from the invoice being
        // credited. Returned goods must re-enter stock at the cost they were
        // issued at — valuing them at `Product.costPrice` (a static field no
        // receipt updates) let a return change the value of inventory it was
        // only supposed to restore.
        const issuedCosts = await originalSaleCosts(tx, sr.saleInvoiceId);

        let costOfGoods = new Prisma.Decimal(0);

        for (const [index, item] of sr.items.entries()) {
          const unitCost =
            issuedCosts.get(item.productId) ??
            new Prisma.Decimal(item.product.costPrice?.toString() ?? '0');
          costOfGoods = costOfGoods.plus(unitCost.mul(item.quantity));

          // SALES_RETURN_IN increases stock
          await createLedgerEntry(tx, {
            transactionType: 'SALES_RETURN_IN',
            productId: item.productId,
            warehouseId: sr.warehouseId,
            shelfId: item.shelfId,
            batchId: item.batchId,
            businessId: input.businessId,
            quantity: item.quantity,
            unitCost,
            referenceTable: 'sales_returns',
            referenceId: sr.id,
            transactionDate: sr.returnDate,
            notes: `Sales Return ${sr.documentNumber} - ${item.product.name}`,
          });

          await tx.salesReturnItem.update({
            where: { id: item.id },
            data: { ...appliedRates[index], ...lineTax[index] },
          });
        }

        await postJournalEntry(tx, {
          businessId: input.businessId,
          source: 'SALE_RETURN',
          sourceId: sr.id,
          date: sr.returnDate,
          narration: `Sales Return ${sr.documentNumber}`,
          postedBy: ctx.userId,
          lines: salesReturnPosting({
            partyId: sr.customerId,
            taxableAmount: tax.totalTaxable.toFixed(2),
            tax: {
              cgst: tax.totalCgst.toFixed(2),
              sgst: tax.totalSgst.toFixed(2),
              igst: tax.totalIgst.toFixed(2),
              cess: tax.totalCess.toFixed(2),
            },
            grandTotal: tax.grandTotal.toFixed(2),
            costOfGoods: costOfGoods.toFixed(2),
          }),
        });

        return tx.salesReturn.update({
          where: { id: input.id },
          data: { status: 'CONFIRMED', ...documentTaxColumns(tax) },
          include: {
            items: {
              include: {
                product: { select: { id: true, name: true, sku: true } },
              },
            },
            customer: { select: { id: true, name: true } },
          },
        });
      });

      return confirmed;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'confirm sales return',
        userId: ctx.userId,
      });
    }
  });

/**
 * Cancel a DRAFT sales return.
 */
export const cancelSalesReturn = businessMemberProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    try {
      const sr = await prisma.salesReturn.findFirst({
        where: { id: input.id, businessId: input.businessId },
      });

      if (!sr) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Sales return not found',
        });
      }

      if (sr.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only DRAFT sales returns can be cancelled',
        });
      }

      return prisma.salesReturn.update({
        where: { id: input.id },
        data: { status: 'CANCELLED' },
      });
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'cancel sales return',
        userId: ctx.userId,
      });
    }
  });
