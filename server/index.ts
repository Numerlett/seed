import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { trpcExpress } from './routers';
import cookieParser from 'cookie-parser';
import { validateENV } from './helpers/validateENV';
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

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(requestLogger);

// Rate limiters applied to specific tRPC procedure paths
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OTP verification attempts. Try again later.' },
});

const tokenRefreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many token refresh requests. Try again later.' },
});

// Apply rate limiters before the tRPC handler for specific sub-paths
app.use('/api/auth.emailVerify', otpVerifyLimiter);
app.use('/api/auth.getNewAccessToken', tokenRefreshLimiter);

app.get('/', (_req, res) => res.send('This is SEED server.'));
app.get('/health', healthCheckHandler);
app.get('/email-template', emailTemplateHandler);
app.use('/api', trpcExpress);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => logger.info(`Listening on port ${PORT}`));
