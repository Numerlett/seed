import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';

/**
 * Shared helpers for integration tests.
 *
 * These run against a real database. `TEST_DATABASE_URL` takes precedence so a
 * developer can point the suite at a scratch database without touching the one
 * their dev server uses; CI just sets `DATABASE_URL` to its service container.
 */

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

/**
 * True when a database is configured. Suites guard themselves with
 * `describe.skipIf(!hasDatabase)` so a machine without one still runs the rest
 * of the test suite green.
 */
export const hasDatabase = Boolean(databaseUrl);

if (databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
}

// Secrets the auth helpers read when their module is first imported. Set before
// any import of the server code below.
process.env.ACCESS_TOKEN_SECRET ??= 'test-access-secret-32-characters-long!!';
process.env.REFRESH_TOKEN_SECRET ??= 'test-refresh-secret-32-chars-long!!!!!';
process.env.FRONTEND_URL ??= 'http://localhost:3000';
process.env.GOOGLE_CLIENT_ID ??= 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET ??= 'test-google-client-secret';
process.env.DEPLOYMENT_MODE ??= 'serverless';
process.env.NODE_ENV ??= 'test';

/**
 * Builds a tRPC context authenticated as the given user, for use with
 * `appRouter.createCaller`.
 */
export function callerContext(userId: string) {
  const accessToken = jwt.sign(
    { id: userId },
    process.env.ACCESS_TOKEN_SECRET as string,
    { expiresIn: '1h' },
  );

  // Procedures under test never touch the response; the request only needs an
  // address for the rate-limit middleware to key on.
  const req = { ip: '127.0.0.1', headers: {}, cookies: {} } as unknown as Request;
  const res = {
    cookie: () => res,
    clearCookie: () => res,
    status: () => res,
    json: () => res,
  } as unknown as Response;

  return { req, res, accessToken, authSource: 'header' as const };
}

/** Unique suffix so parallel runs and reruns never collide on unique columns. */
export function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Asserts the two invariants every set of books must satisfy, whatever
 * documents produced them:
 *
 *   1. Total debits equal total credits.
 *   2. Assets equal liabilities plus equity, once current-period earnings are
 *      counted as equity.
 *
 * Call it at the end of any test that posts. Both held vacuously before this
 * pass — (2) was never checked at all, and the balance sheet was out by the
 * period's profit for every business that had ever traded.
 */
export async function assertBooksBalance(
  caller: {
    accounting: {
      getTrialBalance: (input: { businessId: string; asOf?: Date }) => Promise<{
        totals: { debit: number; credit: number };
      }>;
      getBalanceSheet: (input: { businessId: string; asOf: Date }) => Promise<{
        difference: number;
        balanced: boolean;
      }>;
    };
  },
  businessId: string,
  asOf: Date = new Date(Date.now() + 24 * 60 * 60 * 1000),
): Promise<void> {
  const trial = await caller.accounting.getTrialBalance({ businessId });
  if (trial.totals.debit !== trial.totals.credit) {
    throw new Error(
      `Trial balance does not balance: debits=${trial.totals.debit}, credits=${trial.totals.credit}`,
    );
  }

  const sheet = await caller.accounting.getBalanceSheet({ businessId, asOf });
  if (!sheet.balanced) {
    throw new Error(
      `Balance sheet does not balance: out by ${sheet.difference}`,
    );
  }
}
