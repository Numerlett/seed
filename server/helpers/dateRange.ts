/**
 * Date-range helpers for reports.
 *
 * Clients build range bounds from a `YYYY-MM-DD` input, which `new Date()`
 * parses as midnight UTC. A query filtering `lte` that value therefore
 * excluded everything that happened during the final day of the range: a
 * profit and loss "up to today" omitted today, a month's sales register lost
 * the last day of the month, and any document carrying a real timestamp —
 * payments especially — vanished from the period it belonged to.
 *
 * A reporting period ends at the close of its last day. These helpers make the
 * bounds mean that, regardless of the time-of-day the caller passed.
 *
 * Bounds are handled in UTC, matching how dates are stored and how the clients
 * construct them. A business operating far from UTC can see a late-evening
 * document land in the neighbouring day; correcting that needs a per-business
 * timezone, which this system does not yet record.
 */

/** Start of the day containing `date` (00:00:00.000 UTC). */
export function startOfDay(date: Date): Date {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

/** End of the day containing `date` (23:59:59.999 UTC). */
export function endOfDay(date: Date): Date {
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

/**
 * An inclusive `gte`/`lte` filter over a period, with the upper bound extended
 * to the close of its day.
 */
export function inclusiveRange(from: Date, to: Date): { gte: Date; lte: Date } {
  return { gte: startOfDay(from), lte: endOfDay(to) };
}
