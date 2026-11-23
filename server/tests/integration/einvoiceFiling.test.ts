import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import { callerContext, hasDatabase, uniqueSuffix } from './setup';
import { prisma } from '@seed/database';
import { appRouter } from '../../routers';
import irpSuccess from '../fixtures/irp/generateIrnSuccess.json';
import irpErrors from '../fixtures/irp/errors.json';

/**
 * Cover for filing an invoice with the IRP.
 *
 * `generateIrn` used to write an `EInvoice` row with status PENDING and return
 * without contacting the portal at all. The UI reported success, the invoice
 * was never filed, and no code path existed that could ever move that row on.
 *
 * The portal is stubbed here rather than called: these tests assert what this
 * system does with each answer it can get back, which is the part that was
 * wrong. The payload it sends is asserted separately in
 * `tests/unit/einvoicePayload.test.ts`.
 */

const generateIRN = vi.fn();
const cancelIRN = vi.fn();
const generateEWayBillByIrn = vi.fn();

vi.mock('@seed/integrations', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@seed/integrations')>();
  return {
    ...actual,
    generateIRN: (...args: unknown[]) => generateIRN(...args),
    cancelIRN: (...args: unknown[]) => cancelIRN(...args),
    generateEWayBillByIrn: (...args: unknown[]) => generateEWayBillByIrn(...args),
  };
});

/**
 * A success response with a fresh IRN.
 *
 * `EInvoice.irn` is globally unique, correctly: the portal never issues the
 * same reference number twice. Reusing the fixture's IRN across filings would
 * collide on that constraint for reasons that have nothing to do with the
 * behaviour under test.
 */
let irnCounter = 0;
function irpSuccessResponse() {
  irnCounter += 1;
  return {
    ...irpSuccess,
    Irn: `${irpSuccess.Irn.slice(0, -4)}${String(irnCounter).padStart(4, '0')}`,
  };
}

/** An axios failure shaped the way the IRP returns business errors. */
function irpError(body: unknown, status = 400): AxiosError {
  const error = new AxiosError(`Request failed with status code ${status}`);
  error.response = {
    data: body,
    status,
    statusText: 'Bad Request',
    headers: {},
    config: { headers: {} as never },
  };
  return error;
}

const SELLER_STATE = '27';

describe.skipIf(!hasDatabase)('filing an invoice with the IRP', () => {
  const suffix = uniqueSuffix();
  let businessId: string;
  let userId: string;
  let warehouseId: string;
  let productId: string;
  let customerId: string;
  let caller: ReturnType<typeof appRouter.createCaller>;
  const savedEnv: Record<string, string | undefined> = {};

  async function confirmedInvoice() {
    const invoice = await caller.sales.createSaleInvoice({
      businessId,
      customerId,
      warehouseId,
      items: [{ productId, quantity: 1, unitPrice: 1000, taxRate: 18, discount: 0 }],
    });
    await caller.sales.confirmSaleInvoice({ id: invoice.id, businessId });
    return invoice.id;
  }

  beforeAll(async () => {
    // The dispatch layer refuses before it calls anything when credentials are
    // absent, which is its own tested behaviour. Here we want the call path.
    for (const key of [
      'GSP_CLIENT_ID',
      'GSP_CLIENT_SECRET',
      'GSP_USERNAME',
      'GSP_PASSWORD',
      'GSP_GSTIN',
    ]) {
      savedEnv[key] = process.env[key];
      process.env[key] = 'test-value-for-integration-suite';
    }
    process.env.GSP_GSTIN = `${SELLER_STATE}AAPFU0939F1ZV`;

    const user = await prisma.user.create({
      data: { email: `einvoice-${suffix}@example.test` },
    });
    userId = user.id;

    const business = await prisma.business.create({
      data: {
        name: `EInvoice Co ${suffix}`,
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
        tradeName: 'EInvoice Co',
        legalName: 'EInvoice Co Private Limited',
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
          sku: `EIN-${suffix}`,
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
          gstin: `${SELLER_STATE}AAPFU0939F1ZW`,
          customerType: 'B2B',
          addresses: {
            create: {
              line1: '12 MG Road',
              city: 'Mumbai',
              state: 'Maharashtra',
              postalCode: '400002',
              country: 'India',
            },
          },
        },
      })
    ).id;

    caller = appRouter.createCaller(callerContext(userId));
  });

  beforeEach(() => {
    generateIRN.mockReset();
    cancelIRN.mockReset();
    generateEWayBillByIrn.mockReset();
  });

  afterAll(async () => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }

    if (businessId) {
      await prisma.eWayBill.deleteMany({ where: { businessId } });
      await prisma.eInvoice.deleteMany({ where: { businessId } });
      await prisma.journalLine.deleteMany({ where: { entry: { businessId } } });
      await prisma.journalEntry.deleteMany({ where: { businessId } });
      await prisma.chartOfAccount.deleteMany({ where: { businessId } });
      await prisma.saleInvoiceItem.deleteMany({ where: { saleInvoice: { businessId } } });
      await prisma.saleInvoice.deleteMany({ where: { businessId } });
      await prisma.inventoryLedger.deleteMany({ where: { businessId } });
      await prisma.inventoryStock.deleteMany({ where: { warehouseId } });
      await prisma.product.deleteMany({ where: { businessId } });
      await prisma.address.deleteMany({ where: { party: { businessId } } });
      await prisma.party.deleteMany({ where: { businessId } });
      await prisma.warehouse.deleteMany({ where: { businessId } });
      await prisma.business.delete({ where: { id: businessId } });
    }
    if (userId) await prisma.user.delete({ where: { id: userId } });
  });

  it('stores the IRN, acknowledgement and signed payloads on success', async () => {
    const response = irpSuccessResponse();
    generateIRN.mockResolvedValue(response);
    const invoiceId = await confirmedInvoice();

    const result = await caller.tax.generateIrn({ businessId, invoiceId });

    expect(generateIRN).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('GENERATED');
    expect(result.irn).toBe(response.Irn);
    expect(result.ackNo).toBe(String(irpSuccess.AckNo));
    expect(result.signedQRCode).toBe(irpSuccess.SignedQRCode);
    expect(result.failureReason).toBeNull();

    // "04/09/2026 14:35:09" is 4 September, not 9 April.
    expect(result.ackDate?.toISOString()).toBe('2026-09-04T14:35:09.000Z');
  });

  it('sends the portal what the invoice actually says', async () => {
    generateIRN.mockImplementation(async () => irpSuccessResponse());
    const invoiceId = await confirmedInvoice();

    await caller.tax.generateIrn({ businessId, invoiceId });

    const payload = generateIRN.mock.calls[0][0];
    expect(payload.SellerDtls.Gstin).toBe(`${SELLER_STATE}AAPFU0939F1ZV`);
    expect(payload.BuyerDtls.Gstin).toBe(`${SELLER_STATE}AAPFU0939F1ZW`);
    // Intra-state: the split must be CGST/SGST, and IGST must be absent.
    expect(payload.ValDtls.CgstVal).toBeCloseTo(90, 2);
    expect(payload.ValDtls.SgstVal).toBeCloseTo(90, 2);
    expect(payload.ValDtls.IgstVal).toBeCloseTo(0, 2);
    expect(payload.ValDtls.AssVal).toBeCloseTo(1000, 2);
  });

  it('records the portal reason on a rejection instead of a stuck row', async () => {
    generateIRN.mockRejectedValue(irpError(irpErrors.duplicateIrn));
    const invoiceId = await confirmedInvoice();

    await expect(
      caller.tax.generateIrn({ businessId, invoiceId }),
    ).rejects.toThrow(/Duplicate IRN/);

    const row = await prisma.eInvoice.findUnique({ where: { invoiceId } });
    expect(row?.status).toBe('FAILED');
    expect(row?.failureReason).toContain('2150');
    expect(row?.failureReason).toContain('Duplicate IRN');
    expect(row?.irn).toBeNull();
  });

  it('reports every error the portal returns at once', async () => {
    generateIRN.mockRejectedValue(irpError(irpErrors.multiple));
    const invoiceId = await confirmedInvoice();

    await expect(
      caller.tax.generateIrn({ businessId, invoiceId }),
    ).rejects.toThrow(/Invalid total invoice value.*Recipient GSTIN/s);

    const row = await prisma.eInvoice.findUnique({ where: { invoiceId } });
    expect(row?.failureReason).toContain('2189');
    expect(row?.failureReason).toContain('2233');
  });

  it('lets a failed filing be retried and succeed', async () => {
    generateIRN.mockRejectedValueOnce(irpError(irpErrors.expiredToken));
    const invoiceId = await confirmedInvoice();

    await expect(
      caller.tax.generateIrn({ businessId, invoiceId }),
    ).rejects.toThrow(/Invalid Token/);

    generateIRN.mockImplementationOnce(async () => irpSuccessResponse());
    const retried = await caller.tax.generateIrn({ businessId, invoiceId });

    expect(retried.status).toBe('GENERATED');
    // The reason from the failed attempt must not linger on a filed invoice.
    expect(retried.failureReason).toBeNull();
  });

  it('refuses to file a draft invoice', async () => {
    generateIRN.mockImplementation(async () => irpSuccessResponse());
    const draft = await caller.sales.createSaleInvoice({
      businessId,
      customerId,
      warehouseId,
      items: [{ productId, quantity: 1, unitPrice: 1000, taxRate: 18, discount: 0 }],
    });

    await expect(
      caller.tax.generateIrn({ businessId, invoiceId: draft.id }),
    ).rejects.toThrow(/confirmed invoice/i);

    // Nothing was sent, and no record was left behind.
    expect(generateIRN).not.toHaveBeenCalled();
    const row = await prisma.eInvoice.findUnique({ where: { invoiceId: draft.id } });
    expect(row).toBeNull();
  });

  it('refuses to file the same invoice twice', async () => {
    generateIRN.mockImplementation(async () => irpSuccessResponse());
    const invoiceId = await confirmedInvoice();
    await caller.tax.generateIrn({ businessId, invoiceId });

    generateIRN.mockClear();
    await expect(
      caller.tax.generateIrn({ businessId, invoiceId }),
    ).rejects.toThrow(/already generated/i);
    expect(generateIRN).not.toHaveBeenCalled();
  });

  it('will not raise an e-way bill for an invoice with no IRN', async () => {
    const invoiceId = await confirmedInvoice();

    await expect(
      caller.tax.generateEwayBill({
        businessId,
        invoiceId,
        distance: 120,
        transportMode: '1',
        vehicleType: 'R',
        vehicleNo: 'MH01AB1234',
      }),
    ).rejects.toThrow(/Generate IRN first/i);
    expect(generateEWayBillByIrn).not.toHaveBeenCalled();
  });
});
