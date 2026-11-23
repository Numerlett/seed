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
 * Cover for weighted-average costing.
 *
 * Stock used to enter at its real purchase price and leave at
 * `Product.costPrice` — a field set when the product was created that no
 * receipt ever updates. The two sides used different costs, so
 * `InventoryStock.currentValue` drifted permanently, and nothing posted COGS
 * at all: `Cost of Goods Sold` stayed at zero and gross profit was the entire
 * sale value.
 *
 * The scenario below is the one that exposes it: the same product received at
 * two different prices, then sold.
 */

const SELLER_STATE = '27';

describe.skipIf(!hasDatabase)('weighted-average inventory valuation', () => {
  const suffix = uniqueSuffix();
  let businessId: string;
  let userId: string;
  let warehouseId: string;
  let productId: string;
  let customerId: string;
  let supplierId: string;
  let caller: ReturnType<typeof appRouter.createCaller>;

  async function stockAt(): Promise<{ quantity: number; value: number }> {
    const stock = await prisma.inventoryStock.findFirst({
      where: { productId, warehouseId },
      select: { currentQuantity: true, currentValue: true },
    });
    return {
      quantity: Number(stock?.currentQuantity ?? 0),
      value: Number(stock?.currentValue ?? 0),
    };
  }

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

  /** Receives `quantity` units at `unitPrice` through a confirmed GRN. */
  async function receive(quantity: number, unitPrice: number) {
    const order = await caller.purchase.createPurchaseOrder({
      businessId,
      supplierId,
      items: [{ productId, quantity, unitPrice, taxRate: 0, discount: 0 }],
    });
    await caller.purchase.confirmPurchaseOrder({ id: order.id, businessId });

    const grn = await caller.purchase.createGRN({
      businessId,
      purchaseOrderId: order.id,
      warehouseId,
      supplierId,
      items: [{ productId, quantityReceived: quantity, unitPrice }],
    });
    await caller.purchase.confirmGRN({ id: grn.id, businessId });
  }

  /** Sells `quantity` units and returns the confirmed invoice. */
  async function sell(quantity: number, unitPrice = 1000) {
    const invoice = await caller.sales.createSaleInvoice({
      businessId,
      customerId,
      warehouseId,
      items: [{ productId, quantity, unitPrice, taxRate: 0, discount: 0 }],
    });
    await caller.sales.confirmSaleInvoice({ id: invoice.id, businessId });
    return invoice;
  }

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: `valuation-test-${suffix}@example.test` },
    });
    userId = user.id;

    const business = await prisma.business.create({
      data: { name: `Valuation Test Co ${suffix}`, ownerId: userId },
    });
    businessId = business.id;

    await prisma.businessMembership.create({
      data: { userId, businessId, role: 'OWNER' },
    });
    await prisma.gSTRegistration.create({
      data: {
        businessId,
        gstin: `${SELLER_STATE}AAPFU0939F1ZV`,
        tradeName: 'Valuation Test Co',
        legalName: 'Valuation Test Co Private Limited',
        stateCode: SELLER_STATE,
      },
    });

    warehouseId = (
      await prisma.warehouse.create({ data: { name: `Main ${suffix}`, businessId } })
    ).id;

    // costPrice is deliberately nothing like the prices received below: if any
    // code path still reaches for it, these figures will not add up.
    productId = (
      await prisma.product.create({
        data: {
          name: `Widget ${suffix}`,
          sku: `VAL-${suffix}`,
          businessId,
          costPrice: 999,
          sellingPrice: 1000,
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

  it('averages two receipts at different prices', async () => {
    await receive(10, 100);
    await receive(10, 200);

    const stock = await stockAt();
    expect(stock.quantity).toBe(20);
    // 10 × 100 + 10 × 200 = 3000, so the average is 150 a unit.
    expect(stock.value).toBeCloseTo(3000, 2);
  });

  it('issues stock at the weighted average, not the product cost price', async () => {
    await sell(5);

    const stock = await stockAt();
    expect(stock.quantity).toBe(15);
    // 5 units leave at 150 → 750 removed, 2250 remaining.
    expect(stock.value).toBeCloseTo(2250, 2);
  });

  it('posts COGS and relieves inventory for the cost actually issued', async () => {
    // 750 from the sale above. Inventory was debited 3000 by the receipts.
    expect(await balanceOf(ACCOUNTS.COGS)).toBeCloseTo(750, 2);
    expect(await balanceOf(ACCOUNTS.INVENTORY)).toBeCloseTo(2250, 2);
  });

  it('freezes the issued cost on the invoice line', async () => {
    const line = await prisma.saleInvoiceItem.findFirst({
      where: { saleInvoice: { businessId }, productId },
      orderBy: { id: 'asc' },
      select: { costPrice: true },
    });
    // 150, the average at the moment of issue — not the product's 999.
    expect(Number(line?.costPrice)).toBeCloseTo(150, 2);
  });

  it('leaves no residual value once the location empties', async () => {
    await sell(15);

    const stock = await stockAt();
    expect(stock.quantity).toBe(0);
    // Nothing on hand means nothing to value; a residual paisa here would
    // accumulate on the balance sheet as stock that does not exist.
    expect(stock.value).toBe(0);
  });

  it('keeps the books balanced throughout', async () => {
    await expect(assertBooksBalance(caller, businessId)).resolves.toBeUndefined();
  });
});
