import Decimal from 'decimal.js';
import { Numeric, PostingLine } from './types';

const ZERO = new Decimal(0);

function dec(value: Numeric | null | undefined): Decimal {
  if (value === null || value === undefined || value === '') return ZERO;
  return value instanceof Decimal ? value : new Decimal(value);
}

/**
 * Validates that journal entry lines are balanced. Throws if not.
 *
 * Equality is exact. An earlier float implementation accepted anything within
 * 0.001, which let genuinely unbalanced entries through and accumulated the
 * difference into the trial balance.
 */
export function assertBalanced(lines: PostingLine[]): void {
  const totalDebit = lines.reduce((sum, l) => sum.plus(dec(l.debit)), ZERO);
  const totalCredit = lines.reduce((sum, l) => sum.plus(dec(l.credit)), ZERO);

  if (!totalDebit.equals(totalCredit)) {
    throw new Error(
      `Journal entry is not balanced: debits=${totalDebit.toFixed(2)}, credits=${totalCredit.toFixed(2)}`,
    );
  }
}

/**
 * Validates that every line posts a non-negative amount to exactly one side.
 */
export function assertValidLines(lines: PostingLine[]): void {
  if (lines.length === 0) {
    throw new Error('Journal entry must have at least one line');
  }

  for (const line of lines) {
    const debit = dec(line.debit);
    const credit = dec(line.credit);

    // Compared against zero rather than via isNegative()/isPositive(), which
    // are sign-based: decimal.js reports 0 as positive.
    if (debit.lessThan(0) || credit.lessThan(0)) {
      throw new Error('Journal line amounts cannot be negative');
    }
    if (debit.isZero() && credit.isZero()) {
      throw new Error(
        'A journal line must post an amount to either debit or credit',
      );
    }
    if (debit.greaterThan(0) && credit.greaterThan(0)) {
      throw new Error(
        'A single journal line cannot have both debit and credit > 0',
      );
    }
  }
}

/**
 * Runs every journal entry check. Call this before persisting an entry.
 */
export function assertPostable(lines: PostingLine[]): void {
  assertValidLines(lines);
  assertBalanced(lines);
}

/**
 * Sums the debit column. Exposed so callers can persist a total without
 * recomputing it in floats.
 */
export function totalDebit(lines: PostingLine[]): Decimal {
  return lines.reduce((sum, l) => sum.plus(dec(l.debit)), ZERO);
}

/**
 * Sums the credit column.
 */
export function totalCredit(lines: PostingLine[]): Decimal {
  return lines.reduce((sum, l) => sum.plus(dec(l.credit)), ZERO);
}
