import { describe, it, expect } from 'vitest';
import { endOfDay, inclusiveRange, startOfDay } from '../../helpers/dateRange';

/**
 * The bug these pin: clients build a range bound from a `YYYY-MM-DD` input,
 * which parses as midnight UTC. Filtering `lte` that value dropped everything
 * that happened during the final day — including every payment, which carries
 * a real time-of-day.
 */

describe('endOfDay', () => {
  it('extends a midnight bound to the close of that day', () => {
    const bound = new Date('2026-09-04');
    expect(bound.toISOString()).toBe('2026-09-04T00:00:00.000Z');
    expect(endOfDay(bound).toISOString()).toBe('2026-09-04T23:59:59.999Z');
  });

  it('includes a document posted late in the final day', () => {
    const posted = new Date('2026-09-04T18:30:00.000Z');
    expect(posted <= endOfDay(new Date('2026-09-04'))).toBe(true);
    // The old bound excluded it.
    expect(posted <= new Date('2026-09-04')).toBe(false);
  });

  it('excludes the following day', () => {
    const nextDay = new Date('2026-09-05T00:00:00.000Z');
    expect(nextDay <= endOfDay(new Date('2026-09-04'))).toBe(false);
  });

  it('does not mutate its argument', () => {
    const bound = new Date('2026-09-04');
    endOfDay(bound);
    expect(bound.toISOString()).toBe('2026-09-04T00:00:00.000Z');
  });

  it('normalises a bound that already carries a time', () => {
    expect(endOfDay(new Date('2026-09-04T09:15:00.000Z')).toISOString()).toBe(
      '2026-09-04T23:59:59.999Z',
    );
  });
});

describe('startOfDay', () => {
  it('pulls a bound back to the opening of its day', () => {
    expect(startOfDay(new Date('2026-09-04T09:15:00.000Z')).toISOString()).toBe(
      '2026-09-04T00:00:00.000Z',
    );
  });
});

describe('inclusiveRange', () => {
  it('covers both endpoint days in full', () => {
    const range = inclusiveRange(new Date('2026-09-01'), new Date('2026-09-30'));
    expect(range.gte.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(range.lte.toISOString()).toBe('2026-09-30T23:59:59.999Z');
  });

  it('covers a single-day period', () => {
    const day = new Date('2026-09-04');
    const range = inclusiveRange(day, day);
    const midday = new Date('2026-09-04T12:00:00.000Z');
    expect(midday >= range.gte && midday <= range.lte).toBe(true);
  });
});
