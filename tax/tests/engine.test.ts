import { describe, expect, it } from 'vitest';
import Decimal from 'decimal.js';
import {
  GST_SLABS,
  computeInvoice,
  computeLine,
  isInterState,
  resolveSupplyType,
  stateCodeFromGstin,
  validateGstin,
} from '../engine';
import type { TaxLineInput } from '../types';

const MAHARASHTRA = '27';
const KARNATAKA = '29';

const line = (over: Partial<TaxLineInput> = {}): TaxLineInput => ({
  quantity: 1,
  unitPrice: 1000,
  taxRatePercent: 18,
  ...over,
});

const num = (value: Decimal) => value.toNumber();

describe('computeLine — intra-state split', () => {
  it.each(GST_SLABS)('splits the %s%% slab without inventing tax', (slab) => {
    const result = computeLine(
      line({ unitPrice: 1000, taxRatePercent: slab }),
      false,
    );

    // The halves must reconstruct the slab exactly. Rounding each half
    // independently is what turned 0.25% into 0.26%.
    const combined = result.cgstAmount.plus(result.sgstAmount);
    const expected = new Decimal(1000).times(slab).div(100);

    expect(combined.toString()).toBe(expected.toString());
    expect(num(result.igstAmount)).toBe(0);
  });

  it('regression: the 0.25% slab charges 0.25%, not 0.26%', () => {
    const result = computeLine(
      line({ unitPrice: 10000, taxRatePercent: 0.25 }),
      false,
    );

    expect(num(result.cgstAmount.plus(result.sgstAmount))).toBe(25);
    expect(num(result.cgstRate)).toBe(0.125);
    expect(num(result.sgstRate)).toBe(0.125);
  });

  it('gives the odd paisa to SGST rather than dropping or duplicating it', () => {
    // 18% of 100.05 = 18.009 → 18.01, which cannot halve evenly.
    const result = computeLine(
      line({ unitPrice: 100.05, taxRatePercent: 18 }),
      false,
    );

    expect(num(result.cgstAmount)).toBe(9);
    expect(num(result.sgstAmount)).toBe(9.01);
    expect(num(result.totalTax)).toBe(18.01);
  });
});

describe('computeLine — inter-state', () => {
  it.each(GST_SLABS)('puts the whole %s%% slab on IGST', (slab) => {
    const result = computeLine(
      line({ unitPrice: 1000, taxRatePercent: slab }),
      true,
    );

    expect(result.igstAmount.toString()).toBe(
      new Decimal(1000).times(slab).div(100).toString(),
    );
    expect(num(result.cgstAmount)).toBe(0);
    expect(num(result.sgstAmount)).toBe(0);
  });
});

describe('computeLine — discounts, cess, and negatives', () => {
  it('taxes the value net of discount', () => {
    const result = computeLine(
      line({ unitPrice: 1000, discountAmount: 100, taxRatePercent: 18 }),
      true,
    );

    expect(num(result.taxableAmount)).toBe(900);
    expect(num(result.igstAmount)).toBe(162);
    expect(num(result.lineTotal)).toBe(1062);
  });

  it('charges cess on top of GST', () => {
    const result = computeLine(
      line({ unitPrice: 1000, taxRatePercent: 28, cessRatePercent: 12 }),
      true,
    );

    expect(num(result.igstAmount)).toBe(280);
    expect(num(result.cessAmount)).toBe(120);
    expect(num(result.totalTax)).toBe(400);
  });

  it('rounds credit-note amounts symmetrically with the sale they reverse', () => {
    const sale = computeLine(
      line({ unitPrice: 100.05, taxRatePercent: 5 }),
      true,
    );
    const creditNote = computeLine(
      line({ quantity: -1, unitPrice: 100.05, taxRatePercent: 5 }),
      true,
    );

    expect(num(creditNote.taxableAmount)).toBe(-num(sale.taxableAmount));
    expect(num(creditNote.igstAmount)).toBe(-num(sale.igstAmount));
  });
});

describe('isInterState', () => {
  it('is inter-state when the states differ', () => {
    expect(isInterState(MAHARASHTRA, KARNATAKA)).toBe(true);
  });

  it('is intra-state when the states match', () => {
    expect(isInterState(MAHARASHTRA, MAHARASHTRA)).toBe(false);
  });

  it.each([undefined, null, '', '   '])(
    'regression: treats a buyer state of %p as intra-state, not IGST',
    (buyerState) => {
      // A walk-in B2C customer has no recorded state. Comparing '27' against
      // '' would make every local counter sale inter-state.
      expect(isInterState(MAHARASHTRA, buyerState)).toBe(false);
    },
  );
});

describe('resolveSupplyType', () => {
  it('classifies a 15-character GSTIN as B2B', () => {
    expect(resolveSupplyType('27AAPFU0939F1ZV', false, false)).toBe('B2B');
  });

  it('classifies a missing GSTIN as B2C', () => {
    expect(resolveSupplyType(undefined, false, false)).toBe('B2C');
    expect(resolveSupplyType('', false, false)).toBe('B2C');
  });

  it('prefers export and SEZ over registration status', () => {
    expect(resolveSupplyType('27AAPFU0939F1ZV', true, false)).toBe('EXPORT');
    expect(resolveSupplyType('27AAPFU0939F1ZV', false, true)).toBe('SEZ');
  });
});

describe('computeInvoice — export and SEZ', () => {
  const exportInvoice = (over = {}) =>
    computeInvoice({
      lines: [line({ unitPrice: 5000, taxRatePercent: 18 })],
      sellerStateCode: MAHARASHTRA,
      buyerStateCode: MAHARASHTRA,
      isExport: true,
      ...over,
    });

  it('zero-rates an export under LUT', () => {
    const result = exportInvoice();

    expect(result.isZeroRated).toBe(true);
    expect(num(result.totalTax)).toBe(0);
    expect(num(result.totalTaxable)).toBe(5000);
    expect(result.supplyType).toBe('EXPORT');
  });

  it('charges IGST on an export made with payment of tax', () => {
    const result = exportInvoice({ withPaymentOfTax: true });

    expect(result.isZeroRated).toBe(false);
    expect(num(result.totalIgst)).toBe(900);
    expect(num(result.totalCgst)).toBe(0);
  });

  it('routes an export to IGST even when both parties share a state', () => {
    // Same state on both sides would otherwise resolve to CGST + SGST.
    expect(exportInvoice({ withPaymentOfTax: true }).isInterState).toBe(true);
  });

  it('zero-rates cess alongside GST', () => {
    const result = computeInvoice({
      lines: [
        line({ unitPrice: 5000, taxRatePercent: 28, cessRatePercent: 12 }),
      ],
      sellerStateCode: MAHARASHTRA,
      isSEZ: true,
    });

    expect(num(result.totalCess)).toBe(0);
    expect(num(result.totalTax)).toBe(0);
  });
});

describe('computeInvoice — totals and round-off', () => {
  it('reconciles invoice totals with the sum of its lines', () => {
    const result = computeInvoice({
      lines: [
        line({ quantity: 3, unitPrice: 199.99, taxRatePercent: 18 }),
        line({ quantity: 7, unitPrice: 45.5, taxRatePercent: 12 }),
        line({ quantity: 1, unitPrice: 1250, taxRatePercent: 5 }),
      ],
      sellerStateCode: MAHARASHTRA,
      buyerStateCode: MAHARASHTRA,
    });

    const lineTaxable = result.lines.reduce(
      (sum, l) => sum.plus(l.taxableAmount),
      new Decimal(0),
    );
    const lineTax = result.lines.reduce(
      (sum, l) => sum.plus(l.totalTax),
      new Decimal(0),
    );

    expect(result.totalTaxable.toString()).toBe(lineTaxable.toString());
    expect(result.totalTax.toString()).toBe(lineTax.toString());
    expect(result.grandTotal.toString()).toBe(
      lineTaxable.plus(lineTax).toString(),
    );
  });

  it('splits totals into CGST and SGST that sum to the total tax', () => {
    const result = computeInvoice({
      lines: [line({ unitPrice: 1000, taxRatePercent: 18 })],
      sellerStateCode: MAHARASHTRA,
      buyerStateCode: MAHARASHTRA,
    });

    expect(num(result.totalCgst)).toBe(90);
    expect(num(result.totalSgst)).toBe(90);
    expect(num(result.totalIgst)).toBe(0);
    expect(num(result.totalTax)).toBe(180);
  });

  it('carries the grand total to the nearest rupee', () => {
    const result = computeInvoice({
      lines: [line({ unitPrice: 100.4, taxRatePercent: 18 })],
      sellerStateCode: MAHARASHTRA,
      buyerStateCode: KARNATAKA,
    });

    // 100.40 + 18.07 = 118.47 → 118.00, so round-off is -0.47.
    expect(num(result.grandTotal)).toBe(118.47);
    expect(num(result.roundOff)).toBe(-0.47);
    expect(num(result.roundedGrandTotal)).toBe(118);
  });

  it('leaves a whole-rupee total untouched', () => {
    const result = computeInvoice({
      lines: [line({ unitPrice: 1000, taxRatePercent: 18 })],
      sellerStateCode: MAHARASHTRA,
      buyerStateCode: KARNATAKA,
    });

    expect(num(result.roundOff)).toBe(0);
    expect(num(result.roundedGrandTotal)).toBe(1180);
  });

  it('accepts Decimal and string inputs without a float round-trip', () => {
    const result = computeInvoice({
      lines: [
        {
          quantity: new Decimal('3'),
          unitPrice: '0.1',
          taxRatePercent: '18',
        },
      ],
      sellerStateCode: MAHARASHTRA,
      buyerStateCode: KARNATAKA,
    });

    // 3 × 0.1 is exactly 0.30 in decimal arithmetic, not 0.30000000000000004.
    expect(result.totalTaxable.toString()).toBe('0.3');
  });
});

describe('validateGstin', () => {
  it('accepts a GSTIN with a correct check digit', () => {
    expect(validateGstin('27AAPFU0939F1ZV')).toBe(true);
  });

  it('accepts lowercase input', () => {
    expect(validateGstin('27aapfu0939f1zv')).toBe(true);
  });

  it('rejects a wrong check digit', () => {
    expect(validateGstin('27AAPFU0939F1ZX')).toBe(false);
  });

  it.each(['00AAPFU0939F1ZV', '39AAPFU0939F1ZV'])(
    'rejects the unallocated state code in %s',
    (gstin) => {
      expect(validateGstin(gstin)).toBe(false);
    },
  );

  it.each(['', '27AAPFU0939F1Z', 'not-a-gstin'])(
    'rejects malformed input %p',
    (gstin) => {
      expect(validateGstin(gstin)).toBe(false);
    },
  );
});

describe('stateCodeFromGstin', () => {
  it('reads the leading two digits', () => {
    expect(stateCodeFromGstin('27AAPFU0939F1ZV')).toBe('27');
  });
});
