import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { trpcExpress } from './routers';
import cookieParser from 'cookie-parser';
import { validateENV } from './helpers/validateENV';
import { frontendUrls } from './helpers/frontendUrls';
import { emailTemplateHandler } from './helpers/email-templates';
import { healthCheckHandler } from './helpers';
import { logger, requestLogger } from './helpers/logger';
import { razorpayWebhookHandler } from './lib/payments/razorpayWebhook';
export type * from './routers';

dotenv.config();

const envValidation = validateENV();
if (!envValidation.success) {
  logger.error(envValidation.error);
  process.exit(1);
}

logger.info(
  { deploymentMode: envValidation.data.DEPLOYMENT_MODE },
  `Booting in ${envValidation.data.DEPLOYMENT_MODE} mode`,
);

// Long-running mode dispatches queueable work to BullMQ. No workers consume
// those queues yet, so jobs would be accepted and silently never run. Refuse to
// start rather than drop mail, e-invoices and PDFs on the floor.
if (envValidation.data.DEPLOYMENT_MODE === 'long-running') {
  logger.error(
    'DEPLOYMENT_MODE=long-running requires BullMQ workers, and none are implemented yet. ' +
      'Queued work (email, sms, whatsapp, pdf, einvoice) would be enqueued and never processed. ' +
      'Use DEPLOYMENT_MODE=serverless until the worker process exists.',
  );
  process.exit(1);
}

const app = express();

// Fly (and any reverse proxy) terminates the connection, so without this every
// request reports the proxy's address and all clients share one rate-limit
// budget. Must be set before any limiter reads req.ip.
app.set('trust proxy', 1);

// Security headers. The API serves JSON to a separate frontend origin, so the
// document-oriented policies do not apply: CSP governs pages this server does
// not render, and COEP breaks the cross-origin fetches the SPA depends on.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    // The frontend is a different origin; the default `same-origin` would stop
    // it reading responses at all.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

// Mounted before express.json: the webhook signature is an HMAC over the exact
// bytes the provider sent, and a parsed body cannot reproduce them. Its own
// rate limit is generous, because the provider retries on its own schedule and
// throttling it would drop payment confirmations.
app.post(
  '/webhooks/razorpay',
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  }),
  express.raw({ type: 'application/json', limit: '1mb' }),
  razorpayWebhookHandler,
);

// Bound the request body. Express defaults to 100kb, which is already sane, but
// stating it keeps a future raise from being accidental — an unbounded body is
// a cheap way to exhaust a 256mb machine.
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(
  cors({
    // FRONTEND_URL may be a comma-separated list of allowed origins.
    // Requests with no Origin header (e.g. native mobile, curl) are allowed.
    origin: (origin, callback) => {
      if (!origin || frontendUrls.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  }),
);
app.use(requestLogger);

// Coarse volumetric guard across the whole API. Per-procedure limits live in
// the tRPC middleware chain (server/trpc/rateLimit.ts), because path-mounted
// limiters are bypassable: a batched call to `/api/a.proc,b.proc` does not
// match a limiter mounted on `/api/a.proc`.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Slow down and try again shortly.' },
});

app.get('/', (_req, res) => res.send('This is SEED server.'));
app.get('/health', healthCheckHandler);
app.get('/email-template', emailTemplateHandler);
app.use('/api', apiLimiter, trpcExpress);

const PORT = process.env.PORT || 8080;

const server = app.listen(PORT, () =>
  logger.info(`Listening on port ${PORT}`),
);

/**
 * Graceful shutdown.
 *
 * Fly sends SIGTERM before replacing a machine and again when scaling to zero.
 * Without this the process dies immediately, cutting in-flight requests — a
 * confirmation that has written its invoice but not yet its journal entry is
 * exactly the kind of request that must not be severed mid-transaction. Stop
 * accepting connections, let open requests finish, then close the pool.
 */
const SHUTDOWN_TIMEOUT_MS = 10_000;
let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Shutting down');

  // Hard deadline: if a request hangs, exit anyway rather than let the platform
  // send SIGKILL at an arbitrary point.
  const timer = setTimeout(() => {
    logger.error('Shutdown timed out; exiting');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  timer.unref?.();

  server.close(async (err) => {
    if (err) logger.error({ err }, 'Error while closing HTTP server');
    try {
      const { prisma } = await import('@seed/database');
      await prisma.$disconnect();
    } catch (disconnectError) {
      logger.error({ err: disconnectError }, 'Error disconnecting Prisma');
    }
    logger.info('Shutdown complete');
    process.exit(err ? 1 : 0);
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

// An unhandled rejection leaves the process in an unknown state. Log it with
// the same detail as any other error instead of relying on Node's default,
// which prints to stderr and bypasses the structured logger.
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception; shutting down');
  void shutdown('uncaughtException');
});
