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
 * One trading cycle, end to end: buy stock, sell it, get paid, file the return.
 *
 * Every other suite here checks one mechanism in isolation. This one follows a
 * single business through the arc a real one takes, and asserts that the five
 * systems that must agree actually do: inventory, the ledger, the invoice's own
 * settlement figures, the GST return, and the financial statements.
 *
 * It exists because every defect found in this codebase lived in the gaps
 * between those systems rather than inside any one of them — tax computed but
 * never persisted, stock issued but never costed, payments recorded but never
 * posted, a balance sheet that ignored half the ledger. Each component passed
 * its own tests throughout.
 */

const SELLER_STATE = '27';
const BUYER_STATE_INTRA = '27';

describe.skipIf(!hasDatabase)('a full trading cycle', () => {
  const suffix = uniqueSuffix();
  let businessId: string;
  let userId: string;
  let warehouseId: string;
  let productId: string;
  let customerId: string;
  let supplierId: string;
  let caller: ReturnType<typeof appRouter.createCaller>;

  let invoiceId: string;
  let invoiceTotal: number;

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
      data: { email: `journey-${suffix}@example.test` },
    });
    userId = user.id;

    const business = await prisma.business.create({
      data: {
        name: `Journey Co ${suffix}`,
        ownerId: userId,
        addressLine1: '5 Industrial Estate',
        city: 'Mumbai',
        postalCode: '400001',
        stateCode: SELLER_STATE,
      },
    });
    businessId = business.id;

    await prisma.businessMembership.create({
      data: { userId, businessId, role: 'OWNER' },
    });
    await prisma.gSTRegistration.create({
      data: {
        businessId,
        gstin: `${SELLER_STATE}AAPFU0939F1ZV`,
        tradeName: 'Journey Co',
        legalName: 'Journey Co Private Limited',
        stateCode: SELLER_STATE,
      },
    });

    warehouseId = (
      await prisma.warehouse.create({ data: { name: `Main ${suffix}`, businessId } })
    ).id;

    productId = (
      await prisma.product.create({
        data: {
          name: `Widget ${suffix}`,
          sku: `JRN-${suffix}`,
          businessId,
          costPrice: 0,
          sellingPrice: 1000,
          taxRate: 18,
          discountRate: 0,
          hsnCode: '8471',
          allowNegative: false,
        },
      })
    ).id;

    customerId = (
      await prisma.party.create({
        data: {
          name: `Customer ${suffix}`,
          partyType: 'CUSTOMER',
          businessId,
          stateCode: BUYER_STATE_INTRA,
          gstin: `${BUYER_STATE_INTRA}AAPFU0939F1ZW`,
          customerType: 'B2B',
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
      await prisma.paymentAllocation.deleteMany({
        where: { payment: { businessId } },
      });
      await prisma.payment.deleteMany({ where: { businessId } });
      await prisma.journalLine.deleteMany({ where: { entry: { businessId } } });
      await prisma.journalEntry.deleteMany({ where: { businessId } });
      await prisma.chartOfAccount.deleteMany({ where: { businessId } });
      await prisma.saleInvoiceItem.deleteMany({ where: { saleInvoice: { businessId } } });
      await prisma.saleInvoice.deleteMany({ where: { businessId } });
      await prisma.gRNItem.deleteMany({ where: { grn: { businessId } } });
      await prisma.goodsReceiptNote.deleteMany({ where: { businessId } });
      await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrder: { businessId } } });
      await prisma.purchaseOrder.deleteMany({ where: { businessId } });
      await prisma.inventoryLedger.deleteMany({ where: { businessId } });
      await prisma.inventoryStock.deleteMany({ where: { warehouseId } });
      await prisma.product.deleteMany({ where: { businessId } });
      await prisma.party.deleteMany({ where: { businessId } });
      await prisma.warehouse.deleteMany({ where: { businessId } });
      await prisma.business.delete({ where: { id: businessId } });
    }
    if (userId) await prisma.user.delete({ where: { id: userId } });
  });

  it('step 1: receiving stock values inventory at what was paid for it', async () => {
    const order = await caller.purchase.createPurchaseOrder({
      businessId,
      supplierId,
      items: [{ productId, quantity: 100, unitPrice: 600, taxRate: 18, discount: 0 }],
    });
    await caller.purchase.confirmPurchaseOrder({ id: order.id, businessId });

    const grn = await caller.purchase.createGRN({
      businessId,
      purchaseOrderId: order.id,
      warehouseId,
      supplierId,
      items: [{ productId, quantityReceived: 100, unitPrice: 600 }],
    });
    await caller.purchase.confirmGRN({ id: grn.id, businessId });

    const stock = await prisma.inventoryStock.findFirst({
      where: { productId, warehouseId },
    });
    expect(Number(stock?.currentQuantity)).toBe(100);
    expect(Number(stock?.currentValue)).toBeCloseTo(60000, 2);
    expect(await balanceOf(ACCOUNTS.INVENTORY)).toBeCloseTo(60000, 2);
  });

  it('step 2: confirming a sale freezes tax, issues stock and posts both sides', async () => {
    const invoice = await caller.sales.createSaleInvoice({
      businessId,
      customerId,
      warehouseId,
      items: [{ productId, quantity: 10, unitPrice: 1000, taxRate: 18, discount: 0 }],
    });
    invoiceId = invoice.id;

    await caller.sales.confirmSaleInvoice({ id: invoiceId, businessId });

    const confirmed = await prisma.saleInvoice.findUniqueOrThrow({
      where: { id: invoiceId },
    });
    invoiceTotal = Number(confirmed.grandTotal);

    // 10 × 1000 = 10,000 taxable; intra-state 18% splits 900 / 900.
    expect(Number(confirmed.taxableAmount)).toBeCloseTo(10000, 2);
    expect(Number(confirmed.cgstAmount)).toBeCloseTo(900, 2);
    expect(Number(confirmed.sgstAmount)).toBeCloseTo(900, 2);
    expect(Number(confirmed.igstAmount)).toBeCloseTo(0, 2);
    expect(invoiceTotal).toBeCloseTo(11800, 2);

    // Stock left at cost, not at the selling price.
    const stock = await prisma.inventoryStock.findFirst({
      where: { productId, warehouseId },
    });
    expect(Number(stock?.currentQuantity)).toBe(90);
    expect(Number(stock?.currentValue)).toBeCloseTo(54000, 2);

    // Revenue, GST liability, receivable — and the cost side.
    expect(await balanceOf(ACCOUNTS.SALES)).toBeCloseTo(-10000, 2);
    expect(await balanceOf(ACCOUNTS.GST_OUTPUT_CGST)).toBeCloseTo(-900, 2);
    expect(await balanceOf(ACCOUNTS.ACCOUNTS_RECEIVABLE)).toBeCloseTo(11800, 2);
    expect(await balanceOf(ACCOUNTS.COGS)).toBeCloseTo(6000, 2);
    expect(await balanceOf(ACCOUNTS.INVENTORY)).toBeCloseTo(54000, 2);
  });

  it('step 3: the profit reported is revenue less the real cost of the goods', async () => {
    const pnl = await caller.accounting.getProfitAndLoss({
      businessId,
      dateFrom: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      dateTo: new Date(),
    });

    // 10,000 sold, 6,000 of stock consumed. Gross profit 4,000 — not 10,000,
    // which is what a system that never posts COGS reports.
    expect(pnl.revenue).toBeCloseTo(10000, 2);
    expect(pnl.expenses).toBeCloseTo(6000, 2);
    expect(pnl.netProfit).toBeCloseTo(4000, 2);
  });

  it('step 4: taking payment settles the invoice and clears the receivable', async () => {
    await caller.payments.recordPayment({
      businessId,
      date: new Date(),
      type: 'RECEIVED',
      amount: invoiceTotal,
      method: 'BANK_TRANSFER',
      partyId: customerId,
      allocations: [{ invoiceId, amount: invoiceTotal }],
    });

    const settled = await prisma.saleInvoice.findUniqueOrThrow({
      where: { id: invoiceId },
    });
    expect(settled.paymentStatus).toBe('PAID');
    expect(Number(settled.amountPaid)).toBeCloseTo(invoiceTotal, 2);
    expect(Number(settled.amountDue)).toBeCloseTo(0, 2);

    // The receivable is gone and the money is in the bank.
    expect(await balanceOf(ACCOUNTS.ACCOUNTS_RECEIVABLE)).toBeCloseTo(0, 2);
    expect(await balanceOf(ACCOUNTS.BANK)).toBeCloseTo(invoiceTotal, 2);
  });

  it('step 5: the GST return reports the invoice that was actually raised', async () => {
    const now = new Date();
    const gstr1 = await caller.tax.getGstr1Preview({
      businessId,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    });

    // The B2B table must carry this sale, with the figures frozen on the
    // invoice — this is the check that failed when tax was computed for
    // display and never written to the row.
    const row = gstr1.b2b.find((entry) => entry.id === invoiceId);
    expect(row).toBeDefined();
    expect(row?.taxableAmount).toBeCloseTo(10000, 2);
    expect(row?.cgstAmount).toBeCloseTo(900, 2);
    expect(row?.sgstAmount).toBeCloseTo(900, 2);

    expect(gstr1.summary.taxableAmount).toBeCloseTo(10000, 2);
    expect(gstr1.summary.cgst).toBeCloseTo(900, 2);

    const gstr3b = await caller.tax.getGstr3bPreview({
      businessId,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    });
    expect(gstr3b.outward.taxableAmount).toBeCloseTo(10000, 2);
    expect(gstr3b.outward.cgst).toBeCloseTo(900, 2);
  });

  it('step 6: the statements agree with everything above', async () => {
    await assertBooksBalance(caller, businessId);

    const sheet = await caller.accounting.getBalanceSheet({
      businessId,
      asOf: new Date(),
    });

    // Assets: 54,000 of stock plus 11,800 collected = 65,800.
    expect(sheet.totalAssets).toBeCloseTo(65800, 2);
    // Retained earnings is the profit from step 3.
    expect(sheet.retainedEarnings).toBeCloseTo(4000, 2);
    expect(sheet.difference).toBe(0);
  });
});
