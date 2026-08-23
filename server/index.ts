import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { trpcExpress } from './routers';
import cookieParser from 'cookie-parser';
import { validateENV } from './helpers/validateENV';
import { frontendUrls } from './helpers/frontendUrls';
import { emailTemplateHandler } from './helpers/email-templates';
import { healthCheckHandler } from './helpers';
import { logger, requestLogger } from './helpers/logger';
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

app.use(express.json());
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

app.listen(PORT, () => logger.info(`Listening on port ${PORT}`));
