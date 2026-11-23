import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import crypto from 'crypto';
import type { Request, Response } from 'express';
import { callerContext, hasDatabase, uniqueSuffix } from './setup';
import { prisma } from '@seed/database';
import { appRouter } from '../../routers';
import { ACCOUNTS } from '@seed/accounting';
import { razorpayWebhookHandler } from '../../lib/payments/razorpayWebhook';

/**
 * Cover for the Razorpay webhook.
 *
 * This is the only unauthenticated write path in the system: anyone can POST to
 * it, and the sole thing standing between a forged request and a fabricated
 * payment is the HMAC. It is also the path that turns a customer paying into a
 * settled invoice and a ledger entry, so a silent failure here means money
 * received and no record of it.
 *
 * Gateways retry deliveries as a matter of course, so being safe to replay is
 * not an edge case — it is the normal operating condition.
 */

const WEBHOOK_SECRET = 'whsec_integration_test_secret';
const SELLER_STATE = '27';

/** A `payment_link.paid` event shaped the way Razorpay sends it. */
function paidEvent(linkId: string, paymentId: string, amountPaise: number) {
  return {
    entity: 'event',
    account_id: 'acc_TESTACCOUNT',
    event: 'payment_link.paid',
    contains: ['payment_link', 'payment'],
    payload: {
      payment_link: {
        entity: {
          id: linkId,
          entity: 'payment_link',
          status: 'paid',
          amount: amountPaise,
          amount_paid: amountPaise,
          currency: 'INR',
        },
      },
      payment: {
        entity: {
          id: paymentId,
          entity: 'payment',
          amount: amountPaise,
          currency: 'INR',
          status: 'captured',
          method: 'upi',
          created_at: Math.floor(Date.now() / 1000),
        },
      },
    },
    created_at: Math.floor(Date.now() / 1000),
  };
}

/** Calls the handler the way Express would, with a raw body and a signature. */
async function deliver(
  body: unknown,
  options: { secret?: string; signature?: string } = {},
) {
  const raw = Buffer.from(JSON.stringify(body), 'utf8');
  const signature =
    options.signature ??
    crypto
      .createHmac('sha256', options.secret ?? WEBHOOK_SECRET)
      .update(raw)
      .digest('hex');

  let statusCode = 200;
  let payload: unknown;

  const res = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(value: unknown) {
      payload = value;
      return res;
    },
  } as unknown as Response;

  const req = {
    body: raw,
    header: (name: string) =>
      name.toLowerCase() === 'x-razorpay-signature' ? signature : undefined,
  } as unknown as Request;

  await razorpayWebhookHandler(req, res);
  return { statusCode, payload };
}

describe.skipIf(!hasDatabase)('the Razorpay webhook', () => {
  const suffix = uniqueSuffix();
  let businessId: string;
  let userId: string;
  let warehouseId: string;
  let productId: string;
  let customerId: string;
  let caller: ReturnType<typeof appRouter.createCaller>;
  let savedSecret: string | undefined;

  let invoiceId: string;
  let invoiceTotal: number;
  const linkId = `plink_${suffix.replace(/[^a-zA-Z0-9]/g, '')}`;

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
    savedSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;

    const user = await prisma.user.create({
      data: { email: `webhook-${suffix}@example.test` },
    });
    userId = user.id;

    const business = await prisma.business.create({
      data: { name: `Webhook Co ${suffix}`, ownerId: userId },
    });
    businessId = business.id;

    await prisma.businessMembership.create({
      data: { userId, businessId, role: 'OWNER' },
    });
    await prisma.gSTRegistration.create({
      data: {
        businessId,
        gstin: `${SELLER_STATE}AAPFU0939F1ZV`,
        tradeName: 'Webhook Co',
        legalName: 'Webhook Co Private Limited',
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
          sku: `WHK-${suffix}`,
          businessId,
          costPrice: 600,
          sellingPrice: 1000,
          taxRate: 0,
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

    caller = appRouter.createCaller(callerContext(userId));

    const invoice = await caller.sales.createSaleInvoice({
      businessId,
      customerId,
      warehouseId,
      items: [{ productId, quantity: 1, unitPrice: 1000, taxRate: 0, discount: 0 }],
    });
    invoiceId = invoice.id;
    await caller.sales.confirmSaleInvoice({ id: invoiceId, businessId });

    const confirmed = await prisma.saleInvoice.findUniqueOrThrow({
      where: { id: invoiceId },
    });
    invoiceTotal = Number(confirmed.grandTotal);

    // The link the customer would have been sent. Created directly rather than
    // through the controller so the suite needs no Razorpay credentials.
    await prisma.paymentLink.create({
      data: {
        businessId,
        invoiceId,
        provider: 'RAZORPAY',
        providerLinkId: linkId,
        shortUrl: `https://rzp.io/i/${suffix}`,
        amount: confirmed.grandTotal,
        status: 'CREATED',
      },
    });
  });

  afterAll(async () => {
    if (savedSecret === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET;
    else process.env.RAZORPAY_WEBHOOK_SECRET = savedSecret;

    if (businessId) {
      await prisma.paymentLink.deleteMany({ where: { businessId } });
      await prisma.paymentAllocation.deleteMany({
        where: { payment: { businessId } },
      });
      await prisma.payment.deleteMany({ where: { businessId } });
      await prisma.journalLine.deleteMany({ where: { entry: { businessId } } });
      await prisma.journalEntry.deleteMany({ where: { businessId } });
      await prisma.chartOfAccount.deleteMany({ where: { businessId } });
      await prisma.saleInvoiceItem.deleteMany({ where: { saleInvoice: { businessId } } });
      await prisma.saleInvoice.deleteMany({ where: { businessId } });
      await prisma.inventoryLedger.deleteMany({ where: { businessId } });
      await prisma.inventoryStock.deleteMany({ where: { warehouseId } });
      await prisma.product.deleteMany({ where: { businessId } });
      await prisma.party.deleteMany({ where: { businessId } });
      await prisma.warehouse.deleteMany({ where: { businessId } });
      await prisma.business.delete({ where: { id: businessId } });
    }
    if (userId) await prisma.user.delete({ where: { id: userId } });
  });

  it('rejects a request signed with the wrong secret', async () => {
    const result = await deliver(paidEvent(linkId, 'pay_forged', 118000), {
      secret: 'not-the-real-secret',
    });

    expect(result.statusCode).toBe(401);
    // Nothing was recorded off the back of an unverified request.
    expect(await prisma.payment.count({ where: { businessId } })).toBe(0);
  });

  it('rejects a body altered after signing', async () => {
    const original = paidEvent(linkId, 'pay_original', 118000);
    const signature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(Buffer.from(JSON.stringify(original), 'utf8'))
      .digest('hex');

    const tampered = paidEvent(linkId, 'pay_tampered', 999999);
    const result = await deliver(tampered, { signature });

    expect(result.statusCode).toBe(401);
    expect(await prisma.payment.count({ where: { businessId } })).toBe(0);
  });

  it('rejects a request with no signature at all', async () => {
    const result = await deliver(paidEvent(linkId, 'pay_nosig', 118000), {
      signature: '',
    });
    expect(result.statusCode).toBe(400);
  });

  it('settles the invoice and posts the receipt on a valid event', async () => {
    const result = await deliver(
      paidEvent(linkId, 'pay_genuine_001', Math.round(invoiceTotal * 100)),
    );

    expect(result.statusCode).toBe(200);
    expect(result.payload).toMatchObject({ ok: true, applied: true });

    const link = await prisma.paymentLink.findUniqueOrThrow({
      where: { providerLinkId: linkId },
    });
    expect(link.status).toBe('PAID');
    expect(link.providerPaymentId).toBe('pay_genuine_001');
    expect(link.paymentId).not.toBeNull();

    const invoice = await prisma.saleInvoice.findUniqueOrThrow({
      where: { id: invoiceId },
    });
    expect(invoice.paymentStatus).toBe('PAID');
    expect(Number(invoice.amountDue)).toBeCloseTo(0, 2);

    // The money reached the books, not just the payments table.
    expect(await balanceOf(ACCOUNTS.ACCOUNTS_RECEIVABLE)).toBeCloseTo(0, 2);
    expect(await balanceOf(ACCOUNTS.BANK)).toBeCloseTo(invoiceTotal, 2);

    const payment = await prisma.payment.findFirstOrThrow({
      where: { businessId },
    });
    // The provider's payment id is the reference that ties the two together.
    expect(payment.reference).toBe('pay_genuine_001');
    expect(payment.method).toBe('UPI');
  });

  it('treats a redelivery of the same event as a no-op', async () => {
    // Gateways retry until they get a 2xx, and a retry after a slow response is
    // routine. Recording the money twice would double the customer's credit.
    const result = await deliver(
      paidEvent(linkId, 'pay_genuine_001', Math.round(invoiceTotal * 100)),
    );

    expect(result.statusCode).toBe(200);
    expect(result.payload).toMatchObject({ ok: true, applied: false });

    expect(await prisma.payment.count({ where: { businessId } })).toBe(1);
    expect(await balanceOf(ACCOUNTS.BANK)).toBeCloseTo(invoiceTotal, 2);
  });

  it('ignores a second payment id against a link already settled', async () => {
    const result = await deliver(
      paidEvent(linkId, 'pay_different_002', Math.round(invoiceTotal * 100)),
    );

    expect(result.statusCode).toBe(200);
    expect(result.payload).toMatchObject({ applied: false });
    expect(await prisma.payment.count({ where: { businessId } })).toBe(1);
  });

  it('acknowledges an event for a link it does not know', async () => {
    // A 5xx here would make the provider retry forever over something that will
    // never resolve.
    const result = await deliver(paidEvent('plink_unknown', 'pay_x', 100));
    expect(result.statusCode).toBe(200);
    expect(result.payload).toMatchObject({ applied: false });
  });

  it('acknowledges events it does not act on', async () => {
    const result = await deliver({
      event: 'payment_link.expired',
      payload: { payment_link: { entity: { id: linkId } } },
    });

    expect(result.statusCode).toBe(200);
    expect(result.payload).toMatchObject({ ignored: 'payment_link.expired' });
  });
});
