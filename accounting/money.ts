import Decimal from 'decimal.js';
import type { Numeric } from './types';

/**
 * The one way money is added up in this codebase.
 *
 * Reports used to sum with `Number(x) + Number(y)`, which is how a trial
 * balance ends up at 33329.999999999996 and how a GSTR-1 return files a figure
 * that is a paisa off the invoices behind it. Binary floating point cannot
 * represent 0.1, so every addition of a 2-decimal value is an approximation
 * and the error compounds with the row count.
 *
 * Everything here works in `Decimal` and converts exactly once, at the point
 * where a value leaves for JSON.
 */

const ZERO = new Decimal(0);

/**
 * Coerces anything money-shaped to a Decimal. Null, undefined and empty string
 * are zero, which is what an absent aggregate or an unset column means.
 */
export function money(value: Numeric | null | undefined): Decimal {
  if (value === null || value === undefined || value === '') return ZERO;
  return value instanceof Decimal ? value : new Decimal(value);
}

/** Exact sum of a list of money values. */
export function sumMoney(values: Array<Numeric | null | undefined>): Decimal {
  return values.reduce<Decimal>((total, value) => total.plus(money(value)), ZERO);
}

/**
 * Exact sum of one field across a list of rows.
 *
 * `sumBy(invoices, (i) => i.grandTotal)` reads better at the call site than
 * mapping first, and keeps the Decimal inside.
 */
export function sumBy<T>(
  rows: readonly T[],
  select: (row: T) => Numeric | null | undefined,
): Decimal {
  return rows.reduce<Decimal>((total, row) => total.plus(money(select(row))), ZERO);
}

/**
 * Converts to the `number` the API boundary needs, rounded to paise.
 *
 * This is the only sanctioned way a money value becomes a `number`. Call it
 * once, on the way out — never mid-calculation.
 */
export function toMoneyNumber(value: Numeric | null | undefined): number {
  return money(value).toDecimalPlaces(2).toNumber();
}

/** The string form Prisma wants for a `Decimal` column. */
export function toMoneyString(value: Numeric | null | undefined): string {
  return money(value).toFixed(2);
}

export { Decimal };
