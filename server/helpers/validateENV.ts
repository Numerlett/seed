import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // Server
  PORT: z
    .string()
    .min(1, 'PORT is required')
    .regex(/^\d+$/, 'PORT must be a valid number'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Frontend
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL'),

  REFRESH_TOKEN_SECRET: z
    .string()
    .min(32, 'REFRESH_TOKEN_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_SECRET: z
    .string()
    .min(32, 'ACCESS_TOKEN_SECRET must be at least 32 characters'),

  // Token Expiry
  ACCESS_TOKEN_EXPIRY: z
    .string()
    .regex(
      /^\d+[smhd]$/,
      'ACCESS_TOKEN_EXPIRY must be in format like "15m", "1h", "7d"',
    )
    .default('15m'),
  REFRESH_TOKEN_EXPIRY: z
    .string()
    .regex(
      /^\d+[smhd]$/,
      'REFRESH_TOKEN_EXPIRY must be in format like "15m", "1h", "7d"',
    )
    .default('7d'),

  // Database
  DATABASE_URL: z
    .string()
    .url('DATABASE_URL must be a valid URL')
    .refine(
      (url) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
      'DATABASE_URL must start with "postgresql://" or "postgres://"',
    ),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),

  // Email Configuration
  SMTP_USERNAME: z.string().min(1, 'SMTP_USERNAME is required'),
  SMTP_PASSWORD: z.string().min(1, 'SMTP_PASSWORD is required'),
  SMTP_PORT: z
    .string()
    .regex(/^\d+$/, 'SMTP_PORT must be a valid number')
    .default('587'),
  SMTP_HOST: z.string().min(1, 'SMTP_HOST is required'),
  SMTP_MAIL: z.string().email('SMTP_MAIL must be a valid email'),

  // AWS S3 Configuration
  AWS_REGION: z.string().min(1, 'AWS_REGION is required'),
  AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS_ACCESS_KEY_ID is required'),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS_SECRET_ACCESS_KEY is required'),
  AWS_S3_BUCKET_NAME: z.string().min(1, 'AWS_S3_BUCKET_NAME is required'),

  // Redis (BullMQ job queues)
  REDIS_URL: z
    .string()
    .url('REDIS_URL must be a valid URL')
    .refine(
      (url) => url.startsWith('redis://') || url.startsWith('rediss://'),
      'REDIS_URL must start with "redis://" or "rediss://"',
    )
    .default('redis://localhost:6379'),

  // Optional Test Configuration
  TEST_MAIL: z.string().email('TEST_MAIL must be a valid email').optional(),
  TEST_OTP: z
    .string()
    .regex(/^\d+$/, 'TEST_OTP must contain only digits')
    .optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateENV():
  | { success: true; data: EnvConfig }
  | { success: false; error: string } {
  try {
    const validatedEnv = envSchema.parse(process.env);
    return { success: true, data: validatedEnv };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues
        .map((err) => `   - ${err.path.join('.')}: ${err.message}`)
        .join('\n');
      return {
        success: false,
        error: `Environment validation failed:\n${errorMessage}`,
      };
    }
    return {
      success: false,
      error: `Unexpected error during validation: ${error}`,
    };
  }
}
