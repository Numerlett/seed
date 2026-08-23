import { Request, Response } from 'express';
import { prisma } from '@seed/database';
import { logger } from './logger';

const DB_PROBE_TIMEOUT_MS = 2000;

/**
 * Readiness probe. Verifies the database is actually reachable rather than
 * reporting healthy purely because the process is up — a machine that cannot
 * reach Postgres serves nothing useful and should be taken out of rotation.
 */
export const healthCheckHandler = async (_req: Request, res: Response) => {
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('database probe timed out')),
          DB_PROBE_TIMEOUT_MS,
        ),
      ),
    ]);

    res.json({ message: 'OK', database: 'up', timestamp: Date.now() });
  } catch (error) {
    logger.error({ err: error }, 'Health check failed: database unreachable');
    res.status(503).json({
      message: 'UNAVAILABLE',
      database: 'down',
      timestamp: Date.now(),
    });
  }
};
