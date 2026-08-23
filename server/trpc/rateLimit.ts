import { TRPCError } from '@trpc/server';
import type { Request } from 'express';
import { t } from './index';

/**
 * Per-procedure rate limiting.
 *
 * This runs inside the tRPC middleware chain rather than as Express path
 * middleware. Mounting on a path (`app.use('/api/auth.emailVerify', ...)`) is
 * bypassable: a batched call goes to `/api/auth.emailVerify,other.proc`, which
 * Express's prefix matcher does not match, so the limiter never fires.
 *
 * Counters are per-process and in memory. That is enough while the API runs as
 * a single machine; a multi-machine deployment should move the store to Redis
 * so budgets are shared.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Sweep expired buckets so the map cannot grow without bound. Unref'd so it
// never holds the process open.
const SWEEP_INTERVAL_MS = 60_000;
const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, SWEEP_INTERVAL_MS);
sweeper.unref?.();

/**
 * Best-effort client address. Relies on `trust proxy` being set, without which
 * every request behind a proxy reports the proxy's own address and shares one
 * budget.
 */
function clientKey(req: Request | undefined): string {
  return req?.ip ?? req?.socket?.remoteAddress ?? 'unknown';
}

export type RateLimitOptions = {
  /** Window length in milliseconds. */
  windowMs: number;
  /** Requests permitted per window, per client. */
  max: number;
  /**
   * Shared bucket name. Procedures given the same name draw from one budget;
   * omitted, each procedure is counted separately.
   */
  name?: string;
  /** Message returned once the budget is spent. */
  message?: string;
};

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, name, message } = options;

  return t.middleware(({ ctx, path, next }) => {
    const { req } = ctx as { req?: Request };
    const key = `${name ?? path}:${clientKey(req)}`;
    const now = Date.now();

    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (bucket.count >= max) {
      const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message:
          message ??
          `Too many requests. Try again in ${retryAfterSeconds} seconds.`,
      });
    }

    bucket.count += 1;
    return next();
  });
}

/** Clears all counters. Test helper. */
export function resetRateLimits(): void {
  buckets.clear();
}
