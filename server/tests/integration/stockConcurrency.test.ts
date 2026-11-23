import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { callerContext, hasDatabase, uniqueSuffix } from './setup';
import { prisma } from '@seed/database';
import { appRouter } from '../../routers';

/**
 * Cover for concurrent stock movements.
 *
 * Confirming a sale reads stock twice — once to check availability, once to
 * work out the weighted-average cost — and then writes it. At the default
 * READ COMMITTED isolation, two confirmations running at the same time both
 * read the same "before" position, both decide there is enough, and both
 * deduct: the same units are sold twice and stock goes negative on a product
 * that does not allow it.
 */

const SELLER_STATE = '27';

describe.skipIf(!hasDatabase)('concurrent stock movements', () => {
  const suffix = uniqueSuffix();
  let businessId: string;
  let userId: string;
  let warehouseId: string;
  let productId: string;
  let customerId: string;
  let supplierId: string;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: `concurrency-test-${suffix}@example.test` },
    });
    userId = user.id;

    const business = await prisma.business.create({
      data: { name: `Concurrency Test Co ${suffix}`, ownerId: userId },
    });
    businessId = business.id;

    await prisma.businessMembership.create({
      data: { userId, businessId, role: 'OWNER' },
    });
    await prisma.gSTRegistration.create({
      data: {
        businessId,
        gstin: `${SELLER_STATE}AAPFU0939F1ZV`,
        tradeName: 'Concurrency Test Co',
        legalName: 'Concurrency Test Co Private Limited',
        stateCode: SELLER_STATE,
      },
    });

    warehouseId = (
      await prisma.warehouse.create({ data: { name: `Main ${suffix}`, businessId } })
    ).id;

    // allowNegative is false: overselling must be refused, not absorbed.
    productId = (
      await prisma.product.create({
        data: {
          name: `Widget ${suffix}`,
          sku: `CON-${suffix}`,
          businessId,
          costPrice: 100,
          sellingPrice: 200,
          taxRate: 0,
          discountRate: 0,
          hsnCode: '8471',
          allowNegative: false,
        },
      })
    ).id;

    customerId = (
      await prisma.party.create({
        data: { name: `Customer ${suffix}`, partyType: 'CUSTOMER', businessId, stateCode: SELLER_STATE },
      })
    ).id;
    supplierId = (
      await prisma.party.create({
        data: { name: `Supplier ${suffix}`, partyType: 'SUPPLIER', businessId, stateCode: SELLER_STATE },
      })
    ).id;

    caller = appRouter.createCaller(callerContext(userId));

    // Exactly 10 units on hand.
    const order = await caller.purchase.createPurchaseOrder({
      businessId,
      supplierId,
      items: [{ productId, quantity: 10, unitPrice: 100, taxRate: 0, discount: 0 }],
    });
    await caller.purchase.confirmPurchaseOrder({ id: order.id, businessId });
    const grn = await caller.purchase.createGRN({
      businessId,
      purchaseOrderId: order.id,
      warehouseId,
      supplierId,
      items: [{ productId, quantityReceived: 10, unitPrice: 100 }],
    });
    await caller.purchase.confirmGRN({ id: grn.id, businessId });
  });

  afterAll(async () => {
    if (businessId) {
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

  it('lets only one of two concurrent confirmations take the same stock', async () => {
    // Two invoices for 8 units each against 10 on hand: either alone fits,
    // together they do not.
    const first = await caller.sales.createSaleInvoice({
      businessId,
      customerId,
      warehouseId,
      items: [{ productId, quantity: 8, unitPrice: 200, taxRate: 0, discount: 0 }],
    });
    const second = await caller.sales.createSaleInvoice({
      businessId,
      customerId,
      warehouseId,
      items: [{ productId, quantity: 8, unitPrice: 200, taxRate: 0, discount: 0 }],
    });

    const results = await Promise.allSettled([
      caller.sales.confirmSaleInvoice({ id: first.id, businessId }),
      caller.sales.confirmSaleInvoice({ id: second.id, businessId }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(String((rejected[0] as PromiseRejectedResult).reason)).toMatch(
      /Insufficient stock/i,
    );
  });

  it('never lets stock go negative', async () => {
    const stock = await prisma.inventoryStock.findFirst({
      where: { productId, warehouseId },
      select: { currentQuantity: true },
    });
    // 10 received, 8 sold by whichever confirmation won.
    expect(Number(stock?.currentQuantity)).toBe(2);
  });

  it('gives concurrent invoices distinct document numbers', async () => {
    // Both creates read the current maximum at the same time; the retry is what
    // stops the loser failing on the per-business unique.
    const created = await Promise.all(
      Array.from({ length: 4 }, () =>
        caller.sales.createSaleInvoice({
          businessId,
          customerId,
          warehouseId,
          items: [
            { productId, quantity: 1, unitPrice: 200, taxRate: 0, discount: 0 },
          ],
        }),
      ),
    );

    const numbers = created.map((invoice) => invoice.documentNumber);
    expect(new Set(numbers).size).toBe(numbers.length);
  });
});
