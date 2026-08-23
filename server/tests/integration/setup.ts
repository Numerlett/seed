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
