import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { computeInvoice, computeLine, GST_SLABS, isInterState } from '../engine';

/**
 * Property tests for the GST engine.
 *
 * The worked examples elsewhere pin known cases. These assert the invariants
 * that have to hold for *every* input, because the failures that matter are
 * the ones nobody thought to write an example for: a rate that does not halve
 * evenly, a quantity that produces a third-decimal taxable value, a discount
 * that lands the line on a half-paisa boundary.
 *
 * The generator is seeded so a failure is reproducible rather than a
 * once-in-a-thousand-runs mystery.
 */

/** Deterministic PRNG — mulberry32. */
function rng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const next = rng(20260905);

function randomLine() {
  const rate = GST_SLABS[Math.floor(next() * GST_SLABS.length)];
  // Quantities and prices with awkward decimals, not round numbers.
  const quantity = new Decimal(next() * 20 + 0.001).toDecimalPlaces(3).toString();
  const unitPrice = new Decimal(next() * 5000).toDecimalPlaces(2).toString();
  const gross = new Decimal(quantity).times(unitPrice);
  const discountAmount = new Decimal(gross.times(next() * 0.3))
    .toDecimalPlaces(2)
    .toString();

  return {
    productId: `p-${Math.floor(next() * 1000)}`,
    quantity,
    unitPrice,
    discountAmount,
    taxRatePercent: rate,
    cessRatePercent: next() < 0.2 ? 12 : 0,
  };
}

const CASES = 400;

describe('computeLine invariants', () => {
  it('splits intra-state tax into halves that sum back exactly', () => {
    for (let i = 0; i < CASES; i += 1) {
      const line = randomLine();
      const intra = computeLine(line, false);
      const inter = computeLine(line, true);

      // The whole point of rounding the combined tax once: the two halves must
      // reconstitute the single IGST figure for the same taxable value, to the
      // paisa. Rounding each half separately breaks this on odd rates.
      expect(intra.cgstAmount.plus(intra.sgstAmount).toFixed(2)).toBe(
        inter.igstAmount.toFixed(2),
      );
    }
  });

  it('never lets a rounding half go negative or exceed the total', () => {
    for (let i = 0; i < CASES; i += 1) {
      const intra = computeLine(randomLine(), false);
      const total = intra.cgstAmount.plus(intra.sgstAmount);

      expect(intra.cgstAmount.isNegative()).toBe(false);
      expect(intra.sgstAmount.isNegative()).toBe(false);
      // SGST absorbs the odd paisa, so it is the larger of the two at most by
      // one paisa — never more.
      expect(intra.sgstAmount.minus(intra.cgstAmount).lessThanOrEqualTo('0.01')).toBe(true);
      expect(intra.cgstAmount.lessThanOrEqualTo(total)).toBe(true);
    }
  });

  it('keeps every amount at two decimal places', () => {
    for (let i = 0; i < CASES; i += 1) {
      const line = computeLine(randomLine(), next() < 0.5);
      for (const amount of [
        line.taxableAmount,
        line.cgstAmount,
        line.sgstAmount,
        line.igstAmount,
        line.cessAmount,
      ]) {
        expect(amount.decimalPlaces()).toBeLessThanOrEqual(2);
      }
    }
  });

  it('makes the line total the taxable amount plus every tax charged', () => {
    for (let i = 0; i < CASES; i += 1) {
      const line = computeLine(randomLine(), next() < 0.5);
      const expected = line.taxableAmount
        .plus(line.cgstAmount)
        .plus(line.sgstAmount)
        .plus(line.igstAmount)
        .plus(line.cessAmount);

      expect(line.lineTotal.toFixed(2)).toBe(expected.toFixed(2));
    }
  });

  it('charges either IGST or the CGST/SGST pair, never both', () => {
    for (let i = 0; i < CASES; i += 1) {
      const line = randomLine();

      const inter = computeLine(line, true);
      expect(inter.cgstAmount.isZero()).toBe(true);
      expect(inter.sgstAmount.isZero()).toBe(true);

      const intra = computeLine(line, false);
      expect(intra.igstAmount.isZero()).toBe(true);
    }
  });

  it('charges nothing at all when zero-rated', () => {
    for (let i = 0; i < CASES; i += 1) {
      const line = computeLine(randomLine(), next() < 0.5, true);
      expect(line.cgstAmount.isZero()).toBe(true);
      expect(line.sgstAmount.isZero()).toBe(true);
      expect(line.igstAmount.isZero()).toBe(true);
      // Cess follows the same rule — an export under LUT carries no cess either.
      expect(line.cessAmount.isZero()).toBe(true);
      expect(line.lineTotal.toFixed(2)).toBe(line.taxableAmount.toFixed(2));
    }
  });
});

describe('computeInvoice invariants', () => {
  it('totals exactly equal the sum of its lines', () => {
    for (let i = 0; i < 120; i += 1) {
      const lineCount = 1 + Math.floor(next() * 6);
      const lines = Array.from({ length: lineCount }, randomLine);
      const interState = next() < 0.5;

      const result = computeInvoice({
        lines,
        sellerStateCode: '27',
        buyerStateCode: interState ? '29' : '27',
      });

      const sum = (pick: (l: (typeof result.lines)[number]) => Decimal) =>
        result.lines.reduce((total, line) => total.plus(pick(line)), new Decimal(0));

      expect(result.totalTaxable.toFixed(2)).toBe(sum((l) => l.taxableAmount).toFixed(2));
      expect(result.totalCgst.toFixed(2)).toBe(sum((l) => l.cgstAmount).toFixed(2));
      expect(result.totalSgst.toFixed(2)).toBe(sum((l) => l.sgstAmount).toFixed(2));
      expect(result.totalIgst.toFixed(2)).toBe(sum((l) => l.igstAmount).toFixed(2));
      expect(result.totalCess.toFixed(2)).toBe(sum((l) => l.cessAmount).toFixed(2));
    }
  });

  it('makes the grand total the taxable value plus all tax', () => {
    for (let i = 0; i < 120; i += 1) {
      const lines = Array.from({ length: 1 + Math.floor(next() * 5) }, randomLine);
      const result = computeInvoice({
        lines,
        sellerStateCode: '27',
        buyerStateCode: next() < 0.5 ? '29' : '27',
      });

      const expected = result.totalTaxable
        .plus(result.totalCgst)
        .plus(result.totalSgst)
        .plus(result.totalIgst)
        .plus(result.totalCess);

      expect(result.grandTotal.toFixed(2)).toBe(expected.toFixed(2));
    }
  });

  it('charges the same total tax whichever way the supply is split', () => {
    for (let i = 0; i < 120; i += 1) {
      const lines = Array.from({ length: 1 + Math.floor(next() * 5) }, randomLine);

      const intra = computeInvoice({ lines, sellerStateCode: '27', buyerStateCode: '27' });
      const inter = computeInvoice({ lines, sellerStateCode: '27', buyerStateCode: '29' });

      // A customer must pay the same GST on the same goods regardless of which
      // side of a state line they are on; only the heads it lands under change.
      expect(intra.totalCgst.plus(intra.totalSgst).toFixed(2)).toBe(
        inter.totalIgst.toFixed(2),
      );
      expect(intra.grandTotal.toFixed(2)).toBe(inter.grandTotal.toFixed(2));
    }
  });
});

describe('isInterState', () => {
  it('treats an unknown buyer state as intra-state', () => {
    // A walk-in customer has no recorded state; charging IGST would be wrong.
    expect(isInterState('27', null)).toBe(false);
    expect(isInterState('27', undefined)).toBe(false);
    expect(isInterState('27', '   ')).toBe(false);
  });

  it('compares codes ignoring surrounding whitespace', () => {
    expect(isInterState('27', ' 27 ')).toBe(false);
    expect(isInterState('27', ' 29 ')).toBe(true);
  });
});
