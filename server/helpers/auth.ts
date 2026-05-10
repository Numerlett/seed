import { CookieOptions } from 'express';
import jwt from 'jsonwebtoken';
import ms, { StringValue } from 'ms';
import { Request, Response } from 'express';
import { prisma } from '@seed/database';
import type { UserModel } from '@seed/database/generated/models';
import dotenv from 'dotenv';
import { AccessTokenPayload, RefreshTokenPayload } from '../types/auth';
import { parseUserAgent, extractIpAddress } from './deviceParser';
import { logger } from './logger';

dotenv.config();

// --- Environment Variable Validation ---
const requiredEnvVars = [
  'REFRESH_TOKEN_SECRET',
  'ACCESS_TOKEN_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'FRONTEND_URL',
] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// --- Secrets and Keys ---
export const refreshSecret: jwt.Secret = process.env.REFRESH_TOKEN_SECRET!;

export const accessSecret: jwt.Secret = process.env.ACCESS_TOKEN_SECRET!;

export const googleClientId = process.env.GOOGLE_CLIENT_ID!;

export const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET!;

// --- Expiry Durations ---
export const accessTokenExpiry = process.env.ACCESS_TOKEN_EXPIRY ?? '15m';

export const refreshTokenExpiry = process.env.REFRESH_TOKEN_EXPIRY ?? '7d';

// --- Environment ---
export const isProduction = process.env.NODE_ENV === 'production';

// --- Cookie Configurations ---
export const accessTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/',
  maxAge: ms(accessTokenExpiry as StringValue),
};

export const refreshTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/',
  maxAge: ms(refreshTokenExpiry as StringValue),
};

export const clientBaseUrl = process.env.FRONTEND_URL!;

// --- Test User Configuration ---
// Only enable test user in development mode
export const testMail =
  process.env.NODE_ENV !== 'production'
    ? (process.env.TEST_MAIL ?? null)
    : null;
export const testOtp =
  process.env.NODE_ENV !== 'production' ? (process.env.TEST_OTP ?? null) : null;
export const testUser =
  testMail && testOtp ? { email: testMail, otp: testOtp } : null;

// Log warning if test credentials are configured in production
if (
  process.env.NODE_ENV === 'production' &&
  (process.env.TEST_MAIL || process.env.TEST_OTP)
) {
  logger.warn(
    'Test credentials are configured in production environment — security risk',
  );
}

export function getExpiryDate(timeString: string) {
  const milliseconds = ms(timeString as StringValue);
  return new Date(Date.now() + milliseconds);
}

/**
 * Generate new access + refresh token pair, store the refresh token in the
 * database with enriched device metadata, and optionally set cookies.
 *
 * @param req - Express request (used for UA / IP extraction)
 * @param res - Express response (used for setting cookies)
 * @param user - The authenticated user record
 * @param method - How to deliver tokens: 'cookie', 'return', or 'both'
 * @param loginMethod - Authentication method used: 'email' | 'google'
 */
export const generateTokens = async (
  req: Request,
  res: Response,
  user: UserModel,
  method: 'cookie' | 'return' | 'both' = 'both',
  loginMethod: 'email' | 'google' = 'email',
) => {
  const clientRefreshToken =
    req.cookies['refresh-token'] ||
    req.headers.authorization?.replace('Bearer ', '');

  // Revoke old refresh token if it exists and is different from what we're about to create
  if (clientRefreshToken) {
    try {
      const payload = jwt.verify(
        clientRefreshToken,
        refreshSecret,
      ) as RefreshTokenPayload;

      // Check if token was created very recently (within last 5 seconds)
      // If so, skip revocation to avoid revoking a token we just created
      const tokenAge = Date.now() - new Date(payload.createdAt).getTime();
      if (tokenAge < 5000) {
        // Token was just created, skip revocation
        return {
          accessToken: req.cookies['access-token'] || '',
          refreshToken: clientRefreshToken,
          accessTokenCookieOptions,
          refreshTokenCookieOptions,
        };
      }

      // Valid token found - revoke it since user is requesting new tokens
      const existingToken = await prisma.refreshToken.findUnique({
        where: { token: clientRefreshToken },
      });

      if (existingToken && !existingToken.isRevoked) {
        await prisma.refreshToken.update({
          where: { token: clientRefreshToken },
          data: { isRevoked: true },
        });
      }
    } catch (error) {
      // Invalid or expired token - attempt to revoke in database if it exists
      try {
        const existingToken = await prisma.refreshToken.findUnique({
          where: { token: clientRefreshToken },
        });

        if (existingToken && !existingToken.isRevoked) {
          await prisma.refreshToken.update({
            where: { token: clientRefreshToken },
            data: { isRevoked: true },
          });
        }
      } catch (dbError) {
        // Silently ignore database errors
      }
    }
  }

  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      picture: user.picture,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    } as AccessTokenPayload,
    accessSecret,
    {
      expiresIn: accessTokenExpiry as StringValue,
    },
  );

  const refreshToken = jwt.sign(
    {
      userId: user.id,
      createdAt: new Date().toISOString(),
    } as RefreshTokenPayload,
    refreshSecret,
    {
      expiresIn: refreshTokenExpiry as StringValue,
    },
  );

  const rawUserAgent = req?.headers?.['user-agent'] ?? undefined;
  const ipAddress = extractIpAddress(
    req?.headers?.['x-forwarded-for'],
    req?.socket?.remoteAddress,
  );
  const device = parseUserAgent(rawUserAgent);

  const clientInfo = {
    userAgent: rawUserAgent ?? 'N/A',
    host: req?.headers?.['host'] ?? 'N/A',
    ip: ipAddress,
  };

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: getExpiryDate(refreshTokenExpiry),
      clientInfo,
      lastActiveAt: new Date(),
      deviceName: device.deviceName,
      deviceType: device.deviceType,
      browser: device.browser,
      os: device.os,
      ipAddress,
      loginMethod,
    },
  });

  // Set cookies based on method
  if (method === 'cookie' || method === 'both') {
    res
      .cookie('access-token', accessToken, accessTokenCookieOptions)
      .cookie('refresh-token', refreshToken, refreshTokenCookieOptions);
  }

  return {
    accessToken,
    refreshToken,
    accessTokenCookieOptions,
    refreshTokenCookieOptions,
  };
};
