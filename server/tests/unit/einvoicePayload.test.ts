import { describe, it, expect } from 'vitest';
import { TRPCError } from '@trpc/server';
import { buildEInvoicePayload } from '../../lib/einvoice/payload';

/**
 * The payload builder only ever reads `.toNumber()` and `.isZero()` off a money
 * column, so a stand-in keeps the test free of the Prisma runtime while still
 * exercising the mapping. `decimal.js` is not hoisted to this package.
 */
function d(value: number) {
  return {
    toNumber: () => value,
    isZero: () => value === 0,
  } as never;
}

type Overrides = Record<string, unknown>;

function makeInvoice(overrides: Overrides = {}) {
  const base = {
    id: 'inv_1',
    documentNumber: 'INV-0007',
    invoiceDate: new Date(Date.UTC(2026, 8, 2)),
    status: 'CONFIRMED',
    supplyType: 'B2B',
    isExport: false,
    isSEZ: false,
    placeOfSupply: '29',
    taxableAmount: d(1000),
    cgstAmount: d(0),
    sgstAmount: d(0),
    igstAmount: d(180),
    cessAmount: d(0),
    discountAmount: d(0),
    roundOff: d(0.2),
    grandTotal: d(1179.8),
    items: [
      {
        quantity: d(10),
        unitPrice: d(100),
        discount: d(0),
        taxRate: d(18),
        taxableAmount: d(1000),
        cgstAmount: d(0),
        sgstAmount: d(0),
        igstAmount: d(180),
        cessRate: d(0),
        cessAmount: d(0),
        totalPrice: d(1180),
        hsnCode: '8471',
        product: { name: 'Widget' },
      },
    ],
    customer: {
      name: 'Acme Traders',
      gstin: '29AAPFU0939F1ZV',
      stateCode: '29',
      email: 'buyer@example.com',
      phone: '9999999999',
      addresses: [
        {
          line1: '12 MG Road',
          line2: null,
          city: 'Bengaluru',
          postalCode: '560001',
        },
      ],
    },
    business: {
      addressLine1: '5 Industrial Estate',
      addressLine2: null,
      city: 'Mumbai',
      postalCode: '400001',
      phone: '8888888888',
      email: 'seller@example.com',
      gstRegistration: {
        gstin: '27AAPFU0939F1ZV',
        legalName: 'Seller Pvt Ltd',
        tradeName: 'Seller',
        stateCode: '27',
      },
    },
    ...overrides,
  };
  return base as never;
}

describe('buildEInvoicePayload', () => {
  it('files the stored GST breakup rather than recomputing it', () => {
    // The frozen columns are deliberately inconsistent with quantity × price
    // here: if the builder recomputed, it would "correct" them and file
    // something other than what was printed.
    const payload = buildEInvoicePayload(
      makeInvoice({
        taxableAmount: d(999),
        igstAmount: d(123.45),
        items: [
          {
            quantity: d(10),
            unitPrice: d(100),
            discount: d(0),
            taxRate: d(18),
            taxableAmount: d(999),
            cgstAmount: d(0),
            sgstAmount: d(0),
            igstAmount: d(123.45),
            cessRate: d(0),
            cessAmount: d(0),
            totalPrice: d(1122.45),
            hsnCode: '8471',
            product: { name: 'Widget' },
          },
        ],
      }),
    );

    expect(payload.ValDtls.AssVal).toBe(999);
    expect(payload.ValDtls.IgstVal).toBe(123.45);
    expect(payload.ItemList[0].AssAmt).toBe(999);
    expect(payload.ItemList[0].IgstAmt).toBe(123.45);
  });

  it('formats the document date as dd/mm/yyyy', () => {
    const payload = buildEInvoicePayload(makeInvoice());
    expect(payload.DocDtls.Dt).toBe('02/09/2026');
  });

  it('adds the round-off into the total invoice value', () => {
    const payload = buildEInvoicePayload(makeInvoice());
    expect(payload.ValDtls.TotInvVal).toBeCloseTo(1180, 2);
    expect(payload.ValDtls.RndOffAmt).toBeCloseTo(0.2, 2);
  });

  it('sends URP as the buyer GSTIN for an unregistered export buyer', () => {
    const payload = buildEInvoicePayload(
      makeInvoice({
        isExport: true,
        supplyType: 'EXPORT',
        customer: {
          name: 'Overseas Buyer',
          gstin: null,
          stateCode: '96',
          email: null,
          phone: null,
          addresses: [
            { line1: '1 Harbour St', line2: null, city: 'Singapore', postalCode: 'N/A' },
          ],
        },
      }),
    );
    expect(payload.BuyerDtls.Gstin).toBe('URP');
    // A non-numeric postcode falls back to the documented export placeholder.
    expect(payload.BuyerDtls.Pin).toBe(999999);
  });

  it('marks an export without tax as EXPWOP and with tax as EXPWP', () => {
    const withoutTax = buildEInvoicePayload(
      makeInvoice({ isExport: true, supplyType: 'EXPORT', igstAmount: d(0) }),
    );
    expect(withoutTax.TranDtls.SupTyp).toBe('EXPWOP');

    const withTax = buildEInvoicePayload(
      makeInvoice({ isExport: true, supplyType: 'EXPORT', igstAmount: d(180) }),
    );
    expect(withTax.TranDtls.SupTyp).toBe('EXPWP');
  });

  it('refuses a B2C invoice, which the portal does not register', () => {
    expect(() =>
      buildEInvoicePayload(makeInvoice({ supplyType: 'B2C' })),
    ).toThrow(/B2B, SEZ and export supplies only/);
  });

  it('lists every missing field at once instead of one per rejection', () => {
    let caught: TRPCError | undefined;
    try {
      buildEInvoicePayload(
        makeInvoice({
          business: {
            addressLine1: null,
            addressLine2: null,
            city: null,
            postalCode: null,
            phone: null,
            email: null,
            gstRegistration: {
              gstin: '27AAPFU0939F1ZV',
              legalName: 'Seller Pvt Ltd',
              tradeName: 'Seller',
              stateCode: '27',
            },
          },
        }),
      );
    } catch (error) {
      caught = error as TRPCError;
    }

    expect(caught).toBeInstanceOf(TRPCError);
    expect(caught?.code).toBe('BAD_REQUEST');
    expect(caught?.message).toContain('business address line 1');
    expect(caught?.message).toContain('business city');
    expect(caught?.message).toContain('business postal code');
  });

  it('names the products whose HSN code is missing', () => {
    expect(() =>
      buildEInvoicePayload(
        makeInvoice({
          items: [
            {
              quantity: d(1),
              unitPrice: d(100),
              discount: d(0),
              taxRate: d(18),
              taxableAmount: d(100),
              cgstAmount: d(0),
              sgstAmount: d(0),
              igstAmount: d(18),
              cessRate: d(0),
              cessAmount: d(0),
              totalPrice: d(118),
              hsnCode: null,
              product: { name: 'Unclassified Thing' },
            },
          ],
        }),
      ),
    ).toThrow(/Unclassified Thing/);
  });

  it('requires a customer GSTIN on a B2B supply', () => {
    expect(() =>
      buildEInvoicePayload(
        makeInvoice({
          customer: {
            name: 'Acme',
            gstin: null,
            stateCode: '29',
            email: null,
            phone: null,
            addresses: [
              { line1: '1 St', line2: null, city: 'Pune', postalCode: '411001' },
            ],
          },
        }),
      ),
    ).toThrow(/customer GSTIN/);
  });
});
