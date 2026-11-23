import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { money, sumBy, sumMoney, toMoneyNumber, toMoneyString } from '../money';

/**
 * These tests exist to pin the difference between exact decimal arithmetic and
 * the float arithmetic the reports used to do. Each case below produces a
 * visibly wrong answer with `+` on `number`, which is why they are written as
 * exact equality rather than `toBeCloseTo`.
 */

describe('money', () => {
  it('coerces the shapes a money column arrives in', () => {
    expect(money(12.5).toFixed(2)).toBe('12.50');
    expect(money('12.50').toFixed(2)).toBe('12.50');
    expect(money(new Decimal('12.5')).toFixed(2)).toBe('12.50');
  });

  it('treats absent values as zero', () => {
    // A Prisma `_sum` over no rows is null, and an unset column is undefined.
    expect(money(null).toFixed(2)).toBe('0.00');
    expect(money(undefined).toFixed(2)).toBe('0.00');
    expect(money('').toFixed(2)).toBe('0.00');
  });
});

describe('sumMoney', () => {
  it('adds 0.1 and 0.2 exactly', () => {
    expect(0.1 + 0.2).not.toBe(0.3); // the reason this module exists
    expect(sumMoney([0.1, 0.2]).toFixed(2)).toBe('0.30');
    expect(toMoneyNumber(sumMoney([0.1, 0.2]))).toBe(0.3);
  });

  it('sums a thousand rows of 33.33 without drift', () => {
    const rows = Array.from({ length: 1000 }, () => '33.33');

    const floatTotal = rows.reduce((total, value) => total + Number(value), 0);
    expect(floatTotal).not.toBe(33330);

    expect(sumMoney(rows).toFixed(2)).toBe('33330.00');
    expect(toMoneyNumber(sumMoney(rows))).toBe(33330);
  });

  it('sums paise-level values that float rounds away', () => {
    const rows = Array.from({ length: 3 }, () => '0.01');
    expect(sumMoney(rows).toFixed(2)).toBe('0.03');
  });

  it('is exact across a mixed sign ledger', () => {
    // A running balance: invoices in, payments out, closing at exactly zero.
    const movements = ['1180.50', '-590.25', '-590.25'];
    expect(sumMoney(movements).isZero()).toBe(true);
  });

  it('returns zero for an empty list', () => {
    expect(sumMoney([]).toFixed(2)).toBe('0.00');
  });
});

describe('sumBy', () => {
  it('sums one field across rows', () => {
    const invoices = [
      { grandTotal: '1180.00' },
      { grandTotal: '2360.50' },
      { grandTotal: null },
    ];
    expect(sumBy(invoices, (row) => row.grandTotal).toFixed(2)).toBe('3540.50');
  });
});

describe('toMoneyNumber', () => {
  it('rounds to paise on the way out', () => {
    expect(toMoneyNumber('12.005')).toBe(12.01);
    expect(toMoneyNumber('12.004')).toBe(12.0);
  });

  it('never emits a float artifact', () => {
    // 0.615 -> 0.62, not 0.6149999999999999
    expect(toMoneyNumber(new Decimal('0.615'))).toBe(0.62);
  });
});

describe('toMoneyString', () => {
  it('formats for a Prisma Decimal column', () => {
    expect(toMoneyString(1180)).toBe('1180.00');
    expect(toMoneyString(null)).toBe('0.00');
  });
});
