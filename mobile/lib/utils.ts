/** Join class names, dropping falsy values (NativeWind-friendly `cn`). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Coerce a value to a number. Handles Prisma Decimal fields, which arrive over
 * SuperJSON as Number-coercible values (same approach the web app uses).
 */
export function toNum(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  const n = Number(value as never);
  return Number.isFinite(n) ? n : 0;
}

/** Format a value as INR currency without relying on Hermes Intl. */
export function formatCurrency(value: unknown): string {
  const n = toNum(value);
  const fixed = Math.abs(n).toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  // Indian grouping: last 3 digits, then groups of 2.
  let grouped = intPart;
  if (intPart.length > 3) {
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
  }
  return `${n < 0 ? '-' : ''}₹${grouped}.${decPart}`;
}

/** Short, human date like "6 Jun 2026". */
export function formatDate(value: string | number | Date | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/** Pull a readable message out of a tRPC/unknown error. */
export function errorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error instanceof Error && error.message) return error.message;
  const maybe = error as { message?: unknown };
  if (typeof maybe.message === 'string') return maybe.message;
  return fallback;
}

/** Convert an optional string form field to a number (or undefined when blank). */
export function toOptionalNumber(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Convert a string form field to a number, defaulting to 0. */
export function toNumber(value: string | undefined, fallback = 0): number {
  if (value === undefined || value.trim() === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
