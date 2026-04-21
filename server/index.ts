import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
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

app.get('/', (_req, res) => res.send('This is SEED server.'));
app.get('/health', healthCheckHandler);
app.get('/email-template', emailTemplateHandler);
app.use('/api', trpcExpress);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => logger.info(`Listening on port ${PORT}`));
