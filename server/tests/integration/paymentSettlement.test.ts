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
 * Cover for recording a payment.
 *
 * `recordPayment` used to create a Payment row, write PaymentAllocation rows
 * and stop there: the invoice it settled kept showing the full amount due, and
 * nothing reached the ledger, so collected receivables sat on the balance sheet
 * forever. Payment numbers were also globally unique, which made the second
 * business on the instance unable to record a receipt at all.
 */

const SELLER_STATE = '27';

describe.skipIf(!hasDatabase)('recording a payment', () => {
  const suffix = uniqueSuffix();
  let businessId: string;
  let otherBusinessId: string;
  let userId: string;
  let warehouseId: string;
  let productId: string;
  let customerId: string;
  let otherCustomerId: string;
  let caller: ReturnType<typeof appRouter.createCaller>;

  /** Net movement on an account code, debit-positive. */
  async function balanceOf(code: string, scopeId = businessId): Promise<number> {
    const account = await prisma.chartOfAccount.findFirst({
      where: { businessId: scopeId, code },
      select: { id: true },
    });
    if (!account) return 0;

    const agg = await prisma.journalLine.aggregate({
      where: { accountId: account.id, entry: { businessId: scopeId } },
      _sum: { debit: true, credit: true },
    });
    return Number(agg._sum.debit ?? 0) - Number(agg._sum.credit ?? 0);
  }

  async function makeConfirmedInvoice(quantity: number) {
    const invoice = await caller.sales.createSaleInvoice({
      businessId,
      customerId,
      warehouseId,
      invoiceDate: new Date(),
      items: [{ productId, quantity, unitPrice: 1000, taxRate: 18, discount: 0 }],
    });

    await caller.sales.confirmSaleInvoice({ id: invoice.id, businessId });

    return prisma.saleInvoice.findUniqueOrThrow({ where: { id: invoice.id } });
  }

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: `payment-test-${suffix}@example.test` },
    });
    userId = user.id;

    const business = await prisma.business.create({
      data: { name: `Payment Test Co ${suffix}`, ownerId: userId },
    });
    businessId = business.id;

    // A second business on the same instance: payment numbering restarts per
    // business, so both will mint RCP-0001.
    const otherBusiness = await prisma.business.create({
      data: { name: `Payment Test Two ${suffix}`, ownerId: userId },
    });
    otherBusinessId = otherBusiness.id;

    await prisma.businessMembership.createMany({
      data: [
        { userId, businessId, role: 'OWNER' },
        { userId, businessId: otherBusinessId, role: 'OWNER' },
      ],
    });

    await prisma.gSTRegistration.create({
      data: {
        businessId,
        gstin: `${SELLER_STATE}AAPFU0939F1ZV`,
        tradeName: 'Payment Test Co',
        legalName: 'Payment Test Co Private Limited',
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
          sku: `PAY-${suffix}`,
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

    otherCustomerId = (
      await prisma.party.create({
        data: {
          name: `Other Customer ${suffix}`,
          partyType: 'CUSTOMER',
          businessId: otherBusinessId,
          stateCode: SELLER_STATE,
        },
      })
    ).id;

    caller = appRouter.createCaller(callerContext(userId));
  });

  afterAll(async () => {
    for (const id of [businessId, otherBusinessId].filter(Boolean)) {
      await prisma.paymentAllocation.deleteMany({
        where: { payment: { businessId: id } },
      });
      await prisma.payment.deleteMany({ where: { businessId: id } });
      await prisma.journalLine.deleteMany({ where: { entry: { businessId: id } } });
      await prisma.journalEntry.deleteMany({ where: { businessId: id } });
      await prisma.chartOfAccount.deleteMany({ where: { businessId: id } });
      await prisma.saleInvoiceItem.deleteMany({
        where: { saleInvoice: { businessId: id } },
      });
      await prisma.saleInvoice.deleteMany({ where: { businessId: id } });
      await prisma.inventoryLedger.deleteMany({ where: { businessId: id } });
      await prisma.product.deleteMany({ where: { businessId: id } });
      await prisma.party.deleteMany({ where: { businessId: id } });
      await prisma.warehouse.deleteMany({ where: { businessId: id } });
      await prisma.business.delete({ where: { id } });
    }
    await prisma.user.delete({ where: { id: userId } });
  });

  it('marks the invoice paid and clears the amount due', async () => {
    const invoice = await makeConfirmedInvoice(1);
    const total = Number(invoice.grandTotal);

    await caller.payments.recordPayment({
      businessId,
      date: new Date(),
      type: 'RECEIVED',
      amount: total,
      method: 'UPI',
      partyId: customerId,
      allocations: [{ invoiceId: invoice.id, amount: total }],
    });

    const settled = await prisma.saleInvoice.findUniqueOrThrow({
      where: { id: invoice.id },
    });
    expect(Number(settled.amountPaid)).toBeCloseTo(total, 2);
    expect(Number(settled.amountDue)).toBeCloseTo(0, 2);
    expect(settled.paymentStatus).toBe('PAID');
  });

  it('reports a part payment as PARTIAL with the remainder still due', async () => {
    const invoice = await makeConfirmedInvoice(2);
    const total = Number(invoice.grandTotal);
    const part = Math.round((total / 2) * 100) / 100;

    await caller.payments.recordPayment({
      businessId,
      date: new Date(),
      type: 'RECEIVED',
      amount: part,
      method: 'CASH',
      partyId: customerId,
      allocations: [{ invoiceId: invoice.id, amount: part }],
    });

    const settled = await prisma.saleInvoice.findUniqueOrThrow({
      where: { id: invoice.id },
    });
    expect(settled.paymentStatus).toBe('PARTIAL');
    expect(Number(settled.amountPaid)).toBeCloseTo(part, 2);
    expect(Number(settled.amountDue)).toBeCloseTo(total - part, 2);
  });

  it('posts a balanced entry that clears receivables into the bank', async () => {
    const invoice = await makeConfirmedInvoice(1);
    const total = Number(invoice.grandTotal);

    const before = {
      bank: await balanceOf(ACCOUNTS.BANK),
      receivable: await balanceOf(ACCOUNTS.ACCOUNTS_RECEIVABLE),
    };

    const payment = await caller.payments.recordPayment({
      businessId,
      date: new Date(),
      type: 'RECEIVED',
      amount: total,
      method: 'BANK_TRANSFER',
      partyId: customerId,
      allocations: [{ invoiceId: invoice.id, amount: total }],
    });

    expect(await balanceOf(ACCOUNTS.BANK)).toBeCloseTo(before.bank + total, 2);
    expect(await balanceOf(ACCOUNTS.ACCOUNTS_RECEIVABLE)).toBeCloseTo(
      before.receivable - total,
      2,
    );

    const entry = await prisma.journalEntry.findFirst({
      where: { businessId, source: 'PAYMENT_RECEIVED', sourceId: payment.id },
      include: { lines: true },
    });
    expect(entry).not.toBeNull();

    const debits = entry!.lines.reduce((sum, line) => sum + Number(line.debit), 0);
    const credits = entry!.lines.reduce((sum, line) => sum + Number(line.credit), 0);
    expect(debits).toBeCloseTo(credits, 2);

    // Collecting a receivable moves money between two asset accounts, so the
    // statement must still balance afterwards.
    await assertBooksBalance(caller, businessId);
  });

  it('lets a second business mint its own RCP-0001', async () => {
    // Numbers were globally unique, so this insert used to fail outright.
    const first = await caller.payments.recordPayment({
      businessId: otherBusinessId,
      date: new Date(),
      type: 'RECEIVED',
      amount: 500,
      method: 'CASH',
      partyId: otherCustomerId,
    });

    const mine = await prisma.payment.findFirst({
      where: { businessId, type: 'RECEIVED' },
      orderBy: { createdAt: 'asc' },
      select: { documentNumber: true },
    });

    expect(first.documentNumber).toBe('RCP-0001');
    expect(mine?.documentNumber).toBe('RCP-0001');
  });

  it('refuses to allocate more than the payment covers', async () => {
    const invoice = await makeConfirmedInvoice(1);
    const total = Number(invoice.grandTotal);

    await expect(
      caller.payments.recordPayment({
        businessId,
        date: new Date(),
        type: 'RECEIVED',
        amount: total,
        method: 'CASH',
        partyId: customerId,
        allocations: [{ invoiceId: invoice.id, amount: total + 100 }],
      }),
    ).rejects.toThrow(/more than the payment/);
  });

  it('refuses to settle an invoice belonging to another business', async () => {
    const invoice = await makeConfirmedInvoice(1);

    await expect(
      caller.payments.recordPayment({
        businessId: otherBusinessId,
        date: new Date(),
        type: 'RECEIVED',
        amount: 100,
        method: 'CASH',
        partyId: otherCustomerId,
        allocations: [{ invoiceId: invoice.id, amount: 100 }],
      }),
    ).rejects.toThrow(/does not belong to this business/);
  });
});
