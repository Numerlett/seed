import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

let _redis: Redis | undefined;

export function getRedis(): Redis {
  if (_redis) return _redis;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error(
      '[Redis] REDIS_URL is not set. The @seed/jobs package must not be imported in serverless mode.',
    );
  }

  _redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  _redis.on('error', (err) => {
    console.error('[Redis] Connection error:', err);
  });

  _redis.on('connect', () => {
    console.log('[Redis] Connected');
  });

  return _redis;
}
