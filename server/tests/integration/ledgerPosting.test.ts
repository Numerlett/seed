import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  assertBooksBalance,
  callerContext,
  hasDatabase,
  uniqueSuffix,
} from './setup';
import { prisma } from '@seed/database';
import { appRouter } from '../../routers';
import { ACCOUNTS } from '@seed/accounting';

/**
 * Cover for documents posting to the ledger.
 *
 * `accounting/postings.ts` held a full set of posting rules and zero callers,
 * so nothing created a JournalEntry outside the manual-entry endpoint and the
 * trial balance, P&L and balance sheet only reflected hand-typed journals.
 * These tests assert the books move when documents are confirmed, and that
 * they still balance afterwards.
 */

const SELLER_STATE = '27';

describe.skipIf(!hasDatabase)('documents post to the ledger', () => {
  const suffix = uniqueSuffix();
  let businessId: string;
  let userId: string;
  let warehouseId: string;
  let productId: string;
  let customerId: string;
  let supplierId: string;
  let caller: ReturnType<typeof appRouter.createCaller>;

  /** Net movement on an account code, debit-positive. */
  async function balanceOf(code: string): Promise<number> {
    const account = await prisma.chartOfAccount.findFirst({
      where: { businessId, code },
      select: { id: true },
    });
    if (!account) return 0;

    const agg = await prisma.journalLine.aggregate({
      where: { accountId: account.id, entry: { businessId } },
      _sum: { debit: true, credit: true },
    });
    return Number(agg._sum.debit ?? 0) - Number(agg._sum.credit ?? 0);
  }

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: `ledger-test-${suffix}@example.test` },
    });
    userId = user.id;

    const business = await prisma.business.create({
      data: { name: `Ledger Test Co ${suffix}`, ownerId: userId },
    });
    businessId = business.id;

    await prisma.businessMembership.create({
      data: { userId, businessId, role: 'OWNER' },
    });
    await prisma.gSTRegistration.create({
      data: {
        businessId,
        gstin: `${SELLER_STATE}AAPFU0939F1ZV`,
        tradeName: 'Ledger Test Co',
        legalName: 'Ledger Test Co Private Limited',
        stateCode: SELLER_STATE,
      },
    });

    warehouseId = (
      await prisma.warehouse.create({
        data: { name: `Main ${suffix}`, businessId },
      })
    ).id;

    productId = (
      await prisma.product.create({
        data: {
          name: `Widget ${suffix}`,
          sku: `LGR-${suffix}`,
          businessId,
          costPrice: 600,
          sellingPrice: 1000,
          taxRate: 18,
          discountRate: 0,
          hsnCode: '8471',
          allowNegative: true,
        },
      })
    ).id;

    customerId = (
      await prisma.party.create({
        data: {
          name: `Customer ${suffix}`,
          partyType: 'CUSTOMER',
          businessId,
          stateCode: SELLER_STATE,
        },
      })
    ).id;

    supplierId = (
      await prisma.party.create({
        data: {
          name: `Supplier ${suffix}`,
          partyType: 'SUPPLIER',
          businessId,
          stateCode: SELLER_STATE,
        },
      })
    ).id;

    caller = appRouter.createCaller(callerContext(userId));
  });

  afterAll(async () => {
    if (businessId) {
      await prisma.journalLine.deleteMany({ where: { entry: { businessId } } });
      await prisma.journalEntry.deleteMany({ where: { businessId } });
      await prisma.chartOfAccount.deleteMany({ where: { businessId } });
      await prisma.salesReturnItem.deleteMany({
        where: { salesReturn: { businessId } },
      });
      await prisma.salesReturn.deleteMany({ where: { businessId } });
      await prisma.saleInvoiceItem.deleteMany({
        where: { saleInvoice: { businessId } },
      });
      await prisma.saleInvoice.deleteMany({ where: { businessId } });
      await prisma.purchaseOrderItem.deleteMany({
        where: { purchaseOrder: { businessId } },
      });
      await prisma.purchaseOrder.deleteMany({ where: { businessId } });
      await prisma.inventoryLedger.deleteMany({ where: { businessId } });
      if (warehouseId) {
        await prisma.inventoryStock.deleteMany({ where: { warehouseId } });
      }
      await prisma.product.deleteMany({ where: { businessId } });
      await prisma.party.deleteMany({ where: { businessId } });
      await prisma.warehouse.deleteMany({ where: { businessId } });
      await prisma.business.delete({ where: { id: businessId } });
    }
    if (userId) {
      await prisma.user.delete({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  it('books a confirmed invoice to Debtors, Sales and the GST heads', async () => {
    const invoice = await caller.sales.createSaleInvoice({
      businessId,
      customerId,
      warehouseId,
      items: [{ productId, quantity: 2, unitPrice: 1000, taxRate: 18, discount: 0 }],
    });
    await caller.sales.confirmSaleInvoice({ id: invoice.id, businessId });

    // 2000 taxable + 180 CGST + 180 SGST = 2360 receivable.
    expect(await balanceOf(ACCOUNTS.ACCOUNTS_RECEIVABLE)).toBe(2360);
    expect(await balanceOf(ACCOUNTS.SALES)).toBe(-2000);
    expect(await balanceOf(ACCOUNTS.GST_OUTPUT_CGST)).toBe(-180);
    expect(await balanceOf(ACCOUNTS.GST_OUTPUT_SGST)).toBe(-180);
  });

  it('seeds a chart of accounts on demand rather than requiring a page visit', async () => {
    // Nothing in this test opened the Chart of Accounts screen; posting had to
    // seed it, or the invoice above could not have resolved an account.
    const count = await prisma.chartOfAccount.count({ where: { businessId } });
    expect(count).toBeGreaterThan(0);

    // The two cess accounts the postings reference were missing from the
    // default chart, so any invoice carrying cess would have failed.
    const cess = await prisma.chartOfAccount.findMany({
      where: { businessId, code: { in: [ACCOUNTS.GST_OUTPUT_CESS, ACCOUNTS.GST_INPUT_CESS] } },
    });
    expect(cess).toHaveLength(2);
  });

  it('does not post the same document twice', async () => {
    const before = await prisma.journalEntry.count({
      where: { businessId, source: 'SALE_INVOICE' },
    });

    const invoice = await caller.sales.createSaleInvoice({
      businessId,
      customerId,
      warehouseId,
      items: [{ productId, quantity: 1, unitPrice: 100, taxRate: 18, discount: 0 }],
    });
    await caller.sales.confirmSaleInvoice({ id: invoice.id, businessId });
    // Confirming again is rejected by the status guard, so assert the
    // idempotency key directly instead.
    await expect(
      caller.sales.confirmSaleInvoice({ id: invoice.id, businessId }),
    ).rejects.toThrow();

    const after = await prisma.journalEntry.count({
      where: { businessId, source: 'SALE_INVOICE' },
    });
    expect(after).toBe(before + 1);
  });

  it('books a purchase to GR/IR, input GST and Payables', async () => {
    const po = await caller.purchase.createPurchaseOrder({
      businessId,
      supplierId,
      items: [{ productId, quantity: 5, unitPrice: 600, taxRate: 18, discount: 0 }],
    });
    await caller.purchase.confirmPurchaseOrder({ id: po.id, businessId });

    // 3000 taxable + 270 + 270 = 3540 payable.
    expect(await balanceOf(ACCOUNTS.ACCOUNTS_PAYABLE)).toBe(-3540);
    expect(await balanceOf(ACCOUNTS.GST_INPUT_CGST)).toBe(270);
    expect(await balanceOf(ACCOUNTS.GST_INPUT_SGST)).toBe(270);
  });

  it('reverses the entry when a confirmed purchase order is cancelled', async () => {
    const po = await caller.purchase.createPurchaseOrder({
      businessId,
      supplierId,
      items: [{ productId, quantity: 1, unitPrice: 1000, taxRate: 18, discount: 0 }],
    });
    await caller.purchase.confirmPurchaseOrder({ id: po.id, businessId });

    const payableAfterConfirm = await balanceOf(ACCOUNTS.ACCOUNTS_PAYABLE);
    await caller.purchase.cancelPurchaseOrder({ id: po.id, businessId });
    const payableAfterCancel = await balanceOf(ACCOUNTS.ACCOUNTS_PAYABLE);

    // The reversal cancels the original exactly.
    expect(payableAfterCancel).toBe(payableAfterConfirm + 1180);

    // The original is kept and marked reversed, not deleted.
    const entries = await prisma.journalEntry.findMany({
      where: { businessId, source: 'PURCHASE_ORDER', sourceId: po.id },
    });
    expect(entries).toHaveLength(2);
    expect(entries.filter((e) => e.isReversed)).toHaveLength(1);
    expect(entries.filter((e) => e.reversalOf !== null)).toHaveLength(1);
  });

  it('keeps the trial balance balanced across every document', async () => {
    // Add a return so credit notes are represented too.
    const invoice = await caller.sales.createSaleInvoice({
      businessId,
      customerId,
      warehouseId,
      items: [{ productId, quantity: 4, unitPrice: 500, taxRate: 18, discount: 0 }],
    });
    await caller.sales.confirmSaleInvoice({ id: invoice.id, businessId });

    const ret = await caller.returns.createSalesReturn({
      businessId,
      customerId,
      warehouseId,
      saleInvoiceId: invoice.id,
      items: [{ productId, quantity: 2, unitPrice: 500 }],
    });
    await caller.returns.confirmSalesReturn({ id: ret.id, businessId });

    const trial = await caller.accounting.getTrialBalance({ businessId });

    expect(trial.rows.length).toBeGreaterThan(0);
    // The whole point of double entry: totals must agree exactly.
    expect(trial.totals.debit).toBe(trial.totals.credit);
  });

  it('produces a balance sheet that balances', async () => {
    // By this point the suite has posted invoices, purchases and returns, so
    // income and expense both carry balances. The statement used to ignore
    // them entirely and was out by exactly the net profit.
    const sheet = await caller.accounting.getBalanceSheet({
      businessId,
      asOf: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    expect(sheet.difference).toBe(0);
    expect(sheet.balanced).toBe(true);

    // And the earnings line is the profit, not a placeholder.
    const pnl = await caller.accounting.getProfitAndLoss({
      businessId,
      dateFrom: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      dateTo: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    expect(sheet.retainedEarnings).toBe(pnl.netProfit);
  });

  it('keeps the books balanced after every document type', async () => {
    await expect(assertBooksBalance(caller, businessId)).resolves.toBeUndefined();
  });
});
