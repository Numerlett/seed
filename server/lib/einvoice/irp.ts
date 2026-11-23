import axios from 'axios';

/**
 * Parses a date as the IRP returns it: dd/mm/yyyy, sometimes with a time.
 *
 * `new Date('02/09/2026')` reads that as 2 September in some runtimes and
 * 9 February in others, and silently returns Invalid Date past the 12th — a
 * bug that only shows up on half the days of the month. Parse the parts.
 */
export function parseIrpDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const [datePart, timePart] = value.trim().split(' ');
  const [dd, mm, yyyy] = datePart.split(/[/-]/).map(Number);
  if (!dd || !mm || !yyyy) return null;
  if (mm > 12 || dd > 31) return null;
  const [hh = 0, mi = 0, ss = 0] = (timePart ?? '').split(':').map(Number);
  return new Date(Date.UTC(yyyy, mm - 1, dd, hh, mi, ss));
}

/**
 * Pulls the portal's own explanation out of a failed call.
 *
 * The IRP reports business errors in the response body as well as by status
 * code, and its messages are the only actionable detail the user gets — a bare
 * "Request failed with status code 400" tells them nothing about the duplicate
 * invoice number or invalid GSTIN that caused it.
 */
export function describeGspError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | {
          ErrorDetails?: Array<{ ErrorMessage?: string; ErrorCode?: string }>;
          message?: string;
        }
      | undefined;

    const details = data?.ErrorDetails?.map((detail) =>
      [detail.ErrorCode, detail.ErrorMessage].filter(Boolean).join(': '),
    ).filter(Boolean);

    if (details && details.length > 0) return details.join('; ');
    if (data?.message) return data.message;
    return error.message;
  }
  return error instanceof Error ? error.message : String(error);
}
