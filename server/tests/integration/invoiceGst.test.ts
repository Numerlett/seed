import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { callerContext, hasDatabase, uniqueSuffix } from './setup';
import { prisma } from '@seed/database';
import { appRouter } from '../../routers';

/**
 * End-to-end cover for the GST write path.
 *
 * The bug this exists to catch: `SaleInvoice` and `PurchaseOrder` declare
 * `taxableAmount`, `cgstAmount`, `sgstAmount` and `igstAmount`, and the GSTR
 * previews aggregate exactly those columns — but nothing ever wrote them, so
 * every filing reported zero. A unit test on the tax engine cannot catch that;
 * only running the real procedures against a real database can.
 */

const SELLER_STATE = '27'; // Maharashtra
const BUYER_STATE_SAME = '27';
const BUYER_STATE_OTHER = '29'; // Karnataka

describe.skipIf(!hasDatabase)('GST is persisted end to end', () => {
  const suffix = uniqueSuffix();
  let businessId: string;
  let userId: string;
  let warehouseId: string;
  let productId: string;
  let localCustomerId: string;
  let interStateCustomerId: string;
  let supplierId: string;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: `gst-test-${suffix}@example.test` },
    });
    userId = user.id;

    const business = await prisma.business.create({
      data: { name: `GST Test Co ${suffix}`, ownerId: userId },
    });
    businessId = business.id;

    await prisma.businessMembership.create({
      data: { userId, businessId, role: 'OWNER' },
    });

    // The seller's state comes from the GST registration, not the business row.
    await prisma.gSTRegistration.create({
      data: {
        businessId,
        gstin: `${SELLER_STATE}AAPFU0939F1ZV`,
        tradeName: 'GST Test Co',
        legalName: 'GST Test Co Private Limited',
        stateCode: SELLER_STATE,
      },
    });

    const warehouse = await prisma.warehouse.create({
      data: { name: `Main ${suffix}`, businessId },
    });
    warehouseId = warehouse.id;

    const product = await prisma.product.create({
      data: {
        name: `Widget ${suffix}`,
        sku: `SKU-${suffix}`,
        businessId,
        costPrice: 600,
        sellingPrice: 1000,
        taxRate: 18,
        discountRate: 0,
        hsnCode: '8471',
        allowNegative: true,
      },
    });
    productId = product.id;

    [localCustomerId, interStateCustomerId, supplierId] = await Promise.all([
      prisma.party
        .create({
          data: {
            name: `Local Customer ${suffix}`,
            partyType: 'CUSTOMER',
            businessId,
            stateCode: BUYER_STATE_SAME,
          },
        })
        .then((p) => p.id),
      prisma.party
        .create({
          data: {
            name: `Interstate Customer ${suffix}`,
            partyType: 'CUSTOMER',
            businessId,
            stateCode: BUYER_STATE_OTHER,
          },
        })
        .then((p) => p.id),
      prisma.party
        .create({
          data: {
            name: `Supplier ${suffix}`,
            partyType: 'SUPPLIER',
            businessId,
            stateCode: BUYER_STATE_SAME,
          },
        })
        .then((p) => p.id),
    ]);

    caller = appRouter.createCaller(callerContext(userId));
  });

  afterAll(async () => {
    // Deleted in dependency order, scoped to this run's business. Deleting the
    // business alone is not enough: it cascades to Product, but SaleInvoiceItem
    // references Product with the default restrict rule, so the cascade is
    // rejected and the fixtures leak. Errors are surfaced rather than
    // swallowed — silent cleanup failures let data accumulate unnoticed.
    if (businessId) {
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

  it('splits an intra-state sale into CGST and SGST on confirmation', async () => {
    const created = await caller.sales.createSaleInvoice({
      businessId,
      customerId: localCustomerId,
      warehouseId,
      items: [{ productId, quantity: 2, unitPrice: 1000, taxRate: 18, discount: 0 }],
    });

    const confirmed = await caller.sales.confirmSaleInvoice({
      id: created.id,
      businessId,
    });

    // 2 × 1000 = 2000 taxable, 18% = 360, split evenly.
    expect(Number(confirmed.taxableAmount)).toBe(2000);
    expect(Number(confirmed.cgstAmount)).toBe(180);
    expect(Number(confirmed.sgstAmount)).toBe(180);
    expect(Number(confirmed.igstAmount)).toBe(0);
    expect(Number(confirmed.taxAmount)).toBe(360);
    expect(Number(confirmed.grandTotal)).toBe(2360);
    expect(confirmed.supplyType).toBe('B2C');

    // The line must carry its own breakup — GSTR-1's HSN summary reads it.
    const [line] = await prisma.saleInvoiceItem.findMany({
      where: { saleInvoiceId: created.id },
    });
    expect(Number(line.taxableAmount)).toBe(2000);
    expect(Number(line.cgstAmount)).toBe(180);
    expect(Number(line.sgstAmount)).toBe(180);
    expect(line.hsnCode).toBe('8471');
  });

  it('puts an inter-state sale entirely on IGST', async () => {
    const created = await caller.sales.createSaleInvoice({
      businessId,
      customerId: interStateCustomerId,
      warehouseId,
      items: [{ productId, quantity: 1, unitPrice: 1000, taxRate: 18, discount: 0 }],
    });

    const confirmed = await caller.sales.confirmSaleInvoice({
      id: created.id,
      businessId,
    });

    expect(Number(confirmed.igstAmount)).toBe(180);
    expect(Number(confirmed.cgstAmount)).toBe(0);
    expect(Number(confirmed.sgstAmount)).toBe(0);
  });

  it('records GST on a confirmed purchase, so input tax credit is claimable', async () => {
    const created = await caller.purchase.createPurchaseOrder({
      businessId,
      supplierId,
      items: [{ productId, quantity: 5, unitPrice: 600, taxRate: 18, discount: 0 }],
    });

    const confirmed = await caller.purchase.confirmPurchaseOrder({
      id: created.id,
      businessId,
    });

    // 5 × 600 = 3000 taxable, 18% = 540, intra-state so split evenly.
    expect(Number(confirmed.taxableAmount)).toBe(3000);
    expect(Number(confirmed.cgstAmount)).toBe(270);
    expect(Number(confirmed.sgstAmount)).toBe(270);
  });

  it('surfaces those amounts in the GSTR-3B preview', async () => {
    const now = new Date();
    const preview = await caller.tax.getGstr3bPreview({
      businessId,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    });

    // Output tax across the two confirmed sales: 180 CGST + 180 SGST on the
    // intra-state invoice, 180 IGST on the inter-state one, over 3000 taxable.
    expect(preview.outward.taxableAmount).toBe(3000);
    expect(preview.outward.cgst).toBe(180);
    expect(preview.outward.sgst).toBe(180);
    expect(preview.outward.igst).toBe(180);

    // Input tax credit from the confirmed purchase — zero here was the half of
    // the bug that survived the first fix.
    expect(preview.itc.cgst).toBe(270);
    expect(preview.itc.sgst).toBe(270);
    expect(preview.itc.igst).toBe(0);
  });
});
