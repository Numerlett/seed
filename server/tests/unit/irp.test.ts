import { describe, it, expect } from 'vitest';
import { AxiosError } from 'axios';
import { parseIrpDate, describeGspError } from '../../lib/einvoice/irp';

describe('parseIrpDate', () => {
  it('reads dd/mm/yyyy rather than mm/dd/yyyy', () => {
    // 02/09/2026 is 2 September, not 9 February. Date's own parser disagrees.
    const parsed = parseIrpDate('02/09/2026');
    expect(parsed?.getUTCDate()).toBe(2);
    expect(parsed?.getUTCMonth()).toBe(8);
    expect(parsed?.getUTCFullYear()).toBe(2026);
  });

  it('parses a day past the 12th, which mm/dd would reject', () => {
    const parsed = parseIrpDate('28/02/2026');
    expect(parsed?.getUTCDate()).toBe(28);
    expect(parsed?.getUTCMonth()).toBe(1);
  });

  it('keeps the time when the portal includes one', () => {
    const parsed = parseIrpDate('15/03/2026 14:35:09');
    expect(parsed?.getUTCHours()).toBe(14);
    expect(parsed?.getUTCMinutes()).toBe(35);
    expect(parsed?.getUTCSeconds()).toBe(9);
  });

  it('accepts dashes as separators', () => {
    expect(parseIrpDate('01-12-2026')?.getUTCMonth()).toBe(11);
  });

  it('returns null for absent or unusable values', () => {
    expect(parseIrpDate(undefined)).toBeNull();
    expect(parseIrpDate('')).toBeNull();
    expect(parseIrpDate('not a date')).toBeNull();
    expect(parseIrpDate('02/13/2026')).toBeNull();
  });
});

describe('describeGspError', () => {
  function axiosErrorWith(data: unknown): AxiosError {
    const error = new AxiosError('Request failed with status code 400');
    error.response = {
      data,
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: { headers: {} as never },
    };
    return error;
  }

  it('surfaces the portal error details rather than the HTTP status', () => {
    const message = describeGspError(
      axiosErrorWith({
        ErrorDetails: [
          { ErrorCode: '2150', ErrorMessage: 'Duplicate IRN' },
          { ErrorCode: '2172', ErrorMessage: 'Invalid GSTIN' },
        ],
      }),
    );
    expect(message).toBe('2150: Duplicate IRN; 2172: Invalid GSTIN');
  });

  it('falls back to a plain message field', () => {
    expect(describeGspError(axiosErrorWith({ message: 'Token expired' }))).toBe(
      'Token expired',
    );
  });

  it('falls back to the axios message when the body says nothing', () => {
    expect(describeGspError(axiosErrorWith({}))).toBe(
      'Request failed with status code 400',
    );
  });

  it('handles non-axios failures', () => {
    expect(describeGspError(new Error('socket hang up'))).toBe('socket hang up');
    expect(describeGspError('weird')).toBe('weird');
  });
});
