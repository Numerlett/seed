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
 * The Inventory account and the stock subledger must agree after every kind of
 * stock movement.
 *
 * Every movement goes through one engine, `createLedgerEntry`, which keeps the
 * subledger (`InventoryStock`). Its value reaches the books only if the caller
 * also posts a journal entry — and three callers did not: a purchase return
 * credited GR/IR instead of Inventory, and stock adjustments and damage reports
 * posted nothing at all. Each document balanced on its own, so nothing failed;
 * the balance sheet simply kept reporting goods that had been returned, written
 * off or lost.
 *
 * The only check that sees this is comparing the account with the subledger,
 * after each kind of movement. That is all this suite does.
 */

const STATE = '27';

type Caller = ReturnType<typeof appRouter.createCaller>;

interface Fixture {
  userId: string;
  businessId: string;
  warehouseId: string;
  otherWarehouseId: string;
  productId: string;
  customerId: string;
  supplierId: string;
  caller: Caller;
}

async function createFixture(
  label: string,
  gstEntity: string,
): Promise<Fixture> {
  const suffix = uniqueSuffix();

  const user = await prisma.user.create({
    data: { email: `recon-${label}-${suffix}@example.test` },
  });
  const business = await prisma.business.create({
    data: {
      name: `Recon ${label} ${suffix}`,
      ownerId: user.id,
      addressLine1: '1 Test Street',
      city: 'Mumbai',
      postalCode: '400001',
      stateCode: STATE,
    },
  });
  await prisma.businessMembership.create({
    data: { userId: user.id, businessId: business.id, role: 'OWNER' },
  });
  await prisma.gSTRegistration.create({
    data: {
      businessId: business.id,
      gstin: `${STATE}AAPFU0939F${gstEntity}ZV`,
      tradeName: 'Recon Co',
      legalName: 'Recon Co Private Limited',
      stateCode: STATE,
    },
  });

  const warehouse = await prisma.warehouse.create({
    data: { name: `Main ${suffix}`, businessId: business.id },
  });
  const otherWarehouse = await prisma.warehouse.create({
    data: { name: `Second ${suffix}`, businessId: business.id },
  });
  const product = await prisma.product.create({
    data: {
      name: `Widget ${suffix}`,
      sku: `REC-${suffix}`,
      businessId: business.id,
      costPrice: 0,
      sellingPrice: 1000,
      taxRate: 18,
      discountRate: 0,
      hsnCode: '8471',
      allowNegative: false,
    },
  });
  const customer = await prisma.party.create({
    data: {
      name: `Customer ${suffix}`,
      partyType: 'CUSTOMER',
      businessId: business.id,
      stateCode: STATE,
      gstin: `${STATE}AAPFU0939F${gstEntity}ZW`,
      customerType: 'B2B',
    },
  });
  const supplier = await prisma.party.create({
    data: {
      name: `Supplier ${suffix}`,
      partyType: 'SUPPLIER',
      businessId: business.id,
      stateCode: STATE,
    },
  });

  return {
    userId: user.id,
    businessId: business.id,
    warehouseId: warehouse.id,
    otherWarehouseId: otherWarehouse.id,
    productId: product.id,
    customerId: customer.id,
    supplierId: supplier.id,
    caller: appRouter.createCaller(callerContext(user.id)),
  };
}

/**
 * Deleted in dependency order, scoped to this run's business. Errors are
 * surfaced rather than swallowed: silent cleanup failures let data accumulate.
 */
async function destroyFixture(f: Fixture | undefined): Promise<void> {
  if (!f) return;
  const { businessId, userId } = f;
  const warehouseIds = [f.warehouseId, f.otherWarehouseId];

  await prisma.journalLine.deleteMany({ where: { entry: { businessId } } });
  await prisma.journalEntry.deleteMany({ where: { businessId } });
  await prisma.chartOfAccount.deleteMany({ where: { businessId } });

  await prisma.saleInvoiceItem.deleteMany({
    where: { saleInvoice: { businessId } },
  });
  await prisma.saleInvoice.deleteMany({ where: { businessId } });

  // Returns reference the GRN they reverse, so they go before it.
  await prisma.purchaseReturnItem.deleteMany({
    where: { purchaseReturn: { businessId } },
  });
  await prisma.purchaseReturn.deleteMany({ where: { businessId } });
  await prisma.gRNItem.deleteMany({ where: { grn: { businessId } } });
  await prisma.goodsReceiptNote.deleteMany({ where: { businessId } });
  await prisma.purchaseOrderItem.deleteMany({
    where: { purchaseOrder: { businessId } },
  });
  await prisma.purchaseOrder.deleteMany({ where: { businessId } });

  await prisma.stockAdjustmentItem.deleteMany({
    where: { stockAdjustment: { businessId } },
  });
  await prisma.stockAdjustment.deleteMany({ where: { businessId } });
  await prisma.damageReportItem.deleteMany({
    where: { damageReport: { businessId } },
  });
  await prisma.damageReport.deleteMany({ where: { businessId } });
  await prisma.stockTransferItem.deleteMany({
    where: { stockTransfer: { businessId } },
  });
  await prisma.stockTransfer.deleteMany({ where: { businessId } });

  await prisma.inventoryLedger.deleteMany({ where: { businessId } });
  await prisma.inventoryStock.deleteMany({
    where: { warehouseId: { in: warehouseIds } },
  });
  await prisma.product.deleteMany({ where: { businessId } });
  await prisma.party.deleteMany({ where: { businessId } });
  await prisma.warehouse.deleteMany({ where: { businessId } });
  await prisma.business.delete({ where: { id: businessId } });
  await prisma.user.delete({ where: { id: userId } });
}

/** Debit minus credit on one account — positive for an asset or expense. */
async function balanceOf(businessId: string, code: string): Promise<number> {
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

/** Total value the stock subledger holds for the product, across locations. */
async function subledgerValue(productId: string): Promise<number> {
  const agg = await prisma.inventoryStock.aggregate({
    where: { productId },
    _sum: { currentValue: true },
  });
  return Number(agg._sum.currentValue ?? 0);
}

/** The subledger and the Inventory account both say `expected` — and so agree. */
async function expectReconciled(f: Fixture, expected: number): Promise<void> {
  expect(await subledgerValue(f.productId)).toBeCloseTo(expected, 2);
  expect(await balanceOf(f.businessId, ACCOUNTS.INVENTORY)).toBeCloseTo(
    expected,
    2,
  );
}

/** Buys `quantity` units at `unitPrice` through a confirmed PO and GRN. */
async function receive(f: Fixture, quantity: number, unitPrice: number) {
  const order = await f.caller.purchase.createPurchaseOrder({
    businessId: f.businessId,
    supplierId: f.supplierId,
    items: [
      { productId: f.productId, quantity, unitPrice, taxRate: 18, discount: 0 },
    ],
  });
  await f.caller.purchase.confirmPurchaseOrder({
    id: order.id,
    businessId: f.businessId,
  });

  const grn = await f.caller.purchase.createGRN({
    businessId: f.businessId,
    purchaseOrderId: order.id,
    warehouseId: f.warehouseId,
    supplierId: f.supplierId,
    items: [{ productId: f.productId, quantityReceived: quantity, unitPrice }],
  });
  await f.caller.purchase.confirmGRN({ id: grn.id, businessId: f.businessId });
  return grn;
}

/** Returns `quantity` units of a GRN to the supplier at `unitPrice`. */
async function returnToSupplier(
  f: Fixture,
  grnId: string,
  quantity: number,
  unitPrice: number,
) {
  const pr = await f.caller.returns.createPurchaseReturn({
    businessId: f.businessId,
    supplierId: f.supplierId,
    warehouseId: f.warehouseId,
    grnId,
    items: [{ productId: f.productId, quantity, unitPrice }],
  });
  await f.caller.returns.confirmPurchaseReturn({
    id: pr.id,
    businessId: f.businessId,
  });
}

describe.skipIf(!hasDatabase)(
  'inventory subledger reconciles with the books',
  () => {
    let f: Fixture;
    let grnId: string;

    beforeAll(async () => {
      f = await createFixture('flow', '5');
    });

    afterAll(async () => {
      await destroyFixture(f);
    });

    // The steps share one business and build on each other: each asserts the
    // value left after it, so a failure points at the movement that broke it.

    it('receiving stock puts what was paid into Inventory and clears GR/IR', async () => {
      const grn = await receive(f, 100, 600);
      grnId = grn.id;

      await expectReconciled(f, 60000);
      expect(
        await balanceOf(f.businessId, ACCOUNTS.GR_IR_CLEARING),
      ).toBeCloseTo(0, 2);
    });

    it('a purchase return takes the goods out of Inventory, not just off the payable', async () => {
      await returnToSupplier(f, grnId, 10, 600);

      // 10 units at 600 leave. The supplier leg alone credited GR/IR and left
      // Inventory at 60,000 for stock that was no longer there.
      await expectReconciled(f, 54000);
      expect(
        await balanceOf(f.businessId, ACCOUNTS.GR_IR_CLEARING),
      ).toBeCloseTo(0, 2);
      // 70,800 owed (60,000 plus 18% GST) less the 7,080 debit note.
      expect(
        await balanceOf(f.businessId, ACCOUNTS.ACCOUNTS_PAYABLE),
      ).toBeCloseTo(-63720, 2);
    });

    it('a count that finds a shortfall writes it off as a loss', async () => {
      const adjustment = await f.caller.stockops.createStockAdjustment({
        businessId: f.businessId,
        warehouseId: f.warehouseId,
        reason: 'Cycle count',
        items: [
          {
            productId: f.productId,
            systemQuantity: 90,
            actualQuantity: 86,
            unitCost: 600,
          },
        ],
      });
      await f.caller.stockops.confirmStockAdjustment({
        id: adjustment.id,
        businessId: f.businessId,
      });

      // 4 units at the 600 average: 2,400 out of Inventory, into Stock Loss.
      await expectReconciled(f, 51600);
      expect(await balanceOf(f.businessId, ACCOUNTS.STOCK_LOSS)).toBeCloseTo(
        2400,
        2,
      );
    });

    it('a count that finds a surplus is a gain, netted against the same account', async () => {
      const adjustment = await f.caller.stockops.createStockAdjustment({
        businessId: f.businessId,
        warehouseId: f.warehouseId,
        reason: 'Cycle count',
        items: [
          {
            productId: f.productId,
            systemQuantity: 86,
            actualQuantity: 89,
            unitCost: 600,
          },
        ],
      });
      await f.caller.stockops.confirmStockAdjustment({
        id: adjustment.id,
        businessId: f.businessId,
      });

      // 3 units at 600 come in: 1,800 into Inventory, against Stock Loss.
      await expectReconciled(f, 53400);
      expect(await balanceOf(f.businessId, ACCOUNTS.STOCK_LOSS)).toBeCloseTo(
        600,
        2,
      );
    });

    it('damaged stock is written off at the cost it was carried at', async () => {
      const report = await f.caller.stockops.createDamageReport({
        businessId: f.businessId,
        warehouseId: f.warehouseId,
        reason: 'Dropped in handling',
        items: [
          {
            productId: f.productId,
            quantity: 2,
            unitCost: 600,
            damageType: 'DAMAGED',
          },
        ],
      });
      await f.caller.stockops.confirmDamageReport({
        id: report.id,
        businessId: f.businessId,
      });

      await expectReconciled(f, 52200);
      expect(await balanceOf(f.businessId, ACCOUNTS.STOCK_LOSS)).toBeCloseTo(
        1800,
        2,
      );
    });

    it('a transfer between warehouses changes nothing in Inventory', async () => {
      const transfer = await f.caller.stockops.createStockTransfer({
        businessId: f.businessId,
        sourceWarehouseId: f.warehouseId,
        destWarehouseId: f.otherWarehouseId,
        items: [{ productId: f.productId, quantity: 10, unitCost: 600 }],
      });
      await f.caller.stockops.confirmStockTransfer({
        id: transfer.id,
        businessId: f.businessId,
      });

      // Value moved location, it was not created or destroyed.
      await expectReconciled(f, 52200);
      const second = await prisma.inventoryStock.findFirst({
        where: { productId: f.productId, warehouseId: f.otherWarehouseId },
      });
      expect(Number(second?.currentValue)).toBeCloseTo(6000, 2);
      expect(await balanceOf(f.businessId, ACCOUNTS.STOCK_LOSS)).toBeCloseTo(
        1800,
        2,
      );
    });

    it('a sale relieves Inventory at cost and books the cost of goods sold', async () => {
      const invoice = await f.caller.sales.createSaleInvoice({
        businessId: f.businessId,
        customerId: f.customerId,
        warehouseId: f.warehouseId,
        items: [
          {
            productId: f.productId,
            quantity: 20,
            unitPrice: 1000,
            taxRate: 18,
            discount: 0,
          },
        ],
      });
      await f.caller.sales.confirmSaleInvoice({
        id: invoice.id,
        businessId: f.businessId,
      });

      await expectReconciled(f, 40200);
      expect(await balanceOf(f.businessId, ACCOUNTS.COGS)).toBeCloseTo(
        12000,
        2,
      );
    });

    it('after all of it the books still balance and nothing is stranded in GR/IR', async () => {
      await assertBooksBalance(f.caller, f.businessId);
      expect(
        await balanceOf(f.businessId, ACCOUNTS.GR_IR_CLEARING),
      ).toBeCloseTo(0, 2);
    });
  },
);

describe.skipIf(!hasDatabase)('purchase return valuation', () => {
  let f: Fixture;

  beforeAll(async () => {
    f = await createFixture('price', '6');
  });

  afterAll(async () => {
    await destroyFixture(f);
  });

  it('relieves stock at the price on the return, not the weighted average', async () => {
    // Two receipts at different prices put the weighted average at 700.
    const first = await receive(f, 100, 600);
    await receive(f, 100, 800);
    expect(await subledgerValue(f.productId)).toBeCloseTo(140000, 2);

    // Ten units go back from the 600 lot. A purchase return reverses a specific
    // receipt and the supplier credits that receipt's price, so 6,000 leaves —
    // not the 7,000 the average would give. This is the one outbound path that
    // does not use the average, deliberately: costing it there would leave a
    // 1,000 price difference with no account to take it.
    await returnToSupplier(f, first.id, 10, 600);

    await expectReconciled(f, 134000);
    expect(await balanceOf(f.businessId, ACCOUNTS.GR_IR_CLEARING)).toBeCloseTo(
      0,
      2,
    );
    await assertBooksBalance(f.caller, f.businessId);
  });
});
