import { prisma } from '@seed/database';
import * as z from 'zod';
import { TRPCError } from '@trpc/server';
import crypto from 'crypto';
import sendMail from '../helpers/sendMail';
import { handleControllerError } from '../helpers/controllerErrorHandler';
import {
  accessTokenCookieOptions,
  generateTokens,
  refreshSecret,
  refreshTokenCookieOptions,
  testUser,
  isProduction,
} from '../helpers/auth';
import { oAuth2Client } from '../helpers/googleClient';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { protectedProcedure, publicProcedure } from '../trpc/procedures';
import {
  cleanupExpiredTokens,
  getUserActiveSessions,
  revokeSession,
  revokeAllUserTokens,
} from '../helpers/tokenManagement';
import { RefreshTokenPayload } from '../types/auth';
import otpEmailTemplate from '../helpers/email-templates/otpEmailTemplate';
import { sendWelcomeEmail } from '../helpers/email-templates/welcomeEmailTemplate';
import { createUploadUrl } from '../helpers/aws/s3Upload';
import { S3UploadUrlResponse } from '../types/s3';

export const getUser = protectedProcedure.query(async ({ ctx }) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: ctx.userId,
      },
    });
    return user;
  } catch (error: unknown) {
    handleControllerError(error, {
      operation: 'fetch user',
      userId: ctx.userId,
    });
  }
});

export const updateUser = protectedProcedure
  .input(z.object({ name: z.string() }))
  .mutation(async ({ input: { name }, ctx }) => {
    try {
      const updatedUser = await prisma.user.update({
        where: { id: ctx.userId },
        data: { name },
      });
      return updatedUser;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'update user',
        userId: ctx.userId,
      });
    }
  });

export const getUserProfileUploadUrl = protectedProcedure
  .input(
    z.object({
      contentType: z.string(),
    }),
  )
  .output(
    z.object({
      uploadUrl: z.string().url(),
      publicUrl: z.string().url(),
      bucket: z.string(),
      key: z.string(),
      visibility: z.enum(['PUBLIC', 'PRIVATE']),
    }),
  )
  .query(async ({ input: { contentType }, ctx: { userId } }) => {
    try {
      const key = `profiles/${userId}-avatar.png`;

      const uploadData: S3UploadUrlResponse = await createUploadUrl({
        contentType,
        key,
        isPublic: true,
      });

      if (!uploadData.publicUrl) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate public URL',
        });
      }

      return {
        uploadUrl: uploadData.uploadUrl,
        publicUrl: uploadData.publicUrl,
        bucket: uploadData.bucket,
        key: uploadData.key,
        visibility: uploadData.visibility,
      };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'generate profile upload URL',
        userId,
      });
    }
  });

export const setProfilePicture = protectedProcedure
  .input(
    z.object({
      imageUrl: z.string().url(),
    }),
  )
  .mutation(async ({ input: { imageUrl }, ctx: { userId } }) => {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { picture: imageUrl },
      });
      return { success: true };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'set profile picture',
        userId,
      });
    }
  });

export const emailLogin = publicProcedure
  .input(
    z.object({
      email: z.string().email(),
    }),
  )
  .mutation(async ({ input: { email } }) => {
    try {
      let user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
          },
        });
        sendWelcomeEmail(email);
      }

      if (!user)
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
          cause: 'Failed to create user',
        });

      // Check for recent OTP request (rate limiting)
      const recentOtp = await prisma.otp.findFirst({
        where: {
          email,
          createdAt: {
            gte: new Date(Date.now() - 60 * 1000), // Within last minute
          },
        },
      });

      if (recentOtp) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Please wait before requesting another OTP',
        });
      }

      // Delete expired OTPs and old unverified ones
      await prisma.otp.deleteMany({
        where: {
          email,
          OR: [
            { expiresAt: { lt: new Date() } },
            { verifiedAt: { not: null } },
          ],
        },
      });

      let otp;
      if (!isProduction && testUser && testUser.email === email) {
        otp = testUser.otp;
      } else {
        otp = crypto.randomInt(100000, 1000000).toString(); // 6-digit OTP
      }

      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

      await prisma.otp.create({
        data: {
          email,
          otp,
          expiresAt,
        },
      });

      if (!(testUser && testUser.email === email)) {
        await sendMail({
          to: email,
          subject: 'Verify your email for SEED',
          content: otpEmailTemplate({ otp, to: email, exp: expiresAt }),
        });
      }

      return { otpExpiresAt: expiresAt, message: `OTP sent to ${email}` };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'send login OTP',
      });
    }
  });

export const emailVerify = publicProcedure
  .input(
    z.object({
      email: z.string().email(),
      otp: z.string().length(6),
    }),
  )
  .mutation(async ({ input: { email, otp }, ctx: { req, res } }) => {
    try {
      const otpRecord = await prisma.otp.findFirst({
        where: {
          email,
          verifiedAt: null, // Only get unverified OTPs
        },
        orderBy: {
          createdAt: 'desc', // Get the most recent one
        },
      });

      if (!otpRecord) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'No OTP found for this email',
        });
      }

      // Check if expired
      if (otpRecord.expiresAt < new Date()) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'OTP has expired',
        });
      }

      // Check max attempts (prevent brute force)
      if (otpRecord.attempts >= 5) {
        await prisma.otp.delete({ where: { id: otpRecord.id } });
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Too many failed attempts. Please request a new OTP.',
        });
      }

      // Check if OTP matches
      if (otpRecord.otp !== otp) {
        // Increment attempts
        await prisma.otp.update({
          where: { id: otpRecord.id },
          data: { attempts: { increment: 1 } },
        });
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: `Invalid OTP. ${4 - otpRecord.attempts} attempts remaining.`,
        });
      }

      // Mark OTP as verified
      await prisma.otp.update({
        where: { id: otpRecord.id },
        data: { verifiedAt: new Date() },
      });

      const user = await prisma.user.findUnique({ where: { email } });

      const { accessToken, refreshToken } = await generateTokens(
        req,
        res,
        user!,
        'cookie',
      );

      return {
        accessToken,
        refreshToken,
        email,
        message: 'OTP verified successfully',
        success: true,
      };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'verify OTP',
      });
    }
  });

export const googleAuthUrl = publicProcedure
  .input(
    z.object({
      type: z.enum(['get', 'redirect']).optional().default('get'),
    }),
  )
  .query(async ({ input: { type }, ctx: { req, res } }) => {
    try {
      const authorizeUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email',
        ],
        prompt: 'consent',
      });
      if (type === 'redirect') {
        return res.redirect(authorizeUrl);
      }
      return { url: authorizeUrl };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'generate Google OAuth URL',
      });
    }
  });

export const googleAuthCallback = publicProcedure
  .input(z.object({ code: z.string() }))
  .mutation(async ({ input: { code }, ctx: { req, res } }) => {
    try {
      const { tokens } = await oAuth2Client.getToken(code);
      oAuth2Client.setCredentials(tokens);

      const { access_token, id_token } = tokens;

      const { data } = await axios.get(
        'https://www.googleapis.com/oauth2/v1/userinfo?alt=json',
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        },
      );

      const { email, name, picture } = data as {
        email: string;
        name: string;
        picture: string;
      };

      let user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        user = await prisma.user.create({
          data: { email, name, picture },
        });
        sendWelcomeEmail(email);
      }

      // 🔐 sets httpOnly cookies
      await generateTokens(req, res, user, 'cookie');

      return { success: true };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'Google OAuth callback',
      });
    }
  });

export const logout = protectedProcedure.mutation(
  async ({ ctx: { req, res, userId } }) => {
    try {
      const clientRefreshToken =
        req.cookies?.['refresh-token'] || req.headers['refresh-token'];

      // Revoke the specific refresh token if provided
      if (clientRefreshToken) {
        await prisma.refreshToken.updateMany({
          where: {
            token: clientRefreshToken,
            userId: userId,
          },
          data: {
            isRevoked: true,
          },
        });
      }

      // Clear cookies
      res
        .clearCookie('access-token', accessTokenCookieOptions)
        .clearCookie('refresh-token', refreshTokenCookieOptions);

      return { message: 'User logged out successfully', success: true };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'logout',
        userId,
      });
    }
  },
);

export const getNewAccessToken = publicProcedure
  .input(
    z.object({
      refreshToken: z.string().optional(),
      method: z.enum(['cookie', 'return', 'both']).default('both'),
    }),
  )
  .query(async ({ input: { refreshToken, method }, ctx: { req, res } }) => {
    try {
      const clientRefreshToken =
        req.cookies?.['refresh-token'] ||
        req.headers['refresh-token'] ||
        refreshToken;

      if (!clientRefreshToken) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'No refresh token provided',
        });
      }

      let userId: string;
      try {
        const payload = jwt.verify(
          clientRefreshToken,
          refreshSecret,
        ) as RefreshTokenPayload;
        userId = payload.userId;
      } catch (error) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired refresh token',
          cause: error,
        });
      }

      const dbRefreshToken = await prisma.refreshToken.findUnique({
        where: { userId: userId, token: clientRefreshToken },
        include: { user: true },
      });

      if (!dbRefreshToken) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Refresh token not found in database',
        });
      }

      if (dbRefreshToken.isRevoked) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Refresh token has been revoked',
        });
      }

      if (dbRefreshToken.expiresAt < new Date()) {
        // Clean up expired token
        await prisma.refreshToken.delete({
          where: { id: dbRefreshToken.id },
        });
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Refresh token has expired',
        });
      }

      if (!dbRefreshToken.user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      const {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        accessTokenCookieOptions,
        refreshTokenCookieOptions,
      } = await generateTokens(req, res, dbRefreshToken.user, method);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        accessTokenCookieOptions,
        refreshTokenCookieOptions,
      };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'refresh access token',
      });
    }
  });

// Session management endpoints
export const getActiveSessions = protectedProcedure.query(
  async ({ ctx: { userId } }) => {
    try {
      const sessions = await getUserActiveSessions(userId);
      return sessions;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'fetch active sessions',
        userId,
      });
    }
  },
);

export const revokeSessionById = protectedProcedure
  .input(
    z.object({
      sessionId: z.string(),
    }),
  )
  .mutation(async ({ input: { sessionId }, ctx: { userId } }) => {
    try {
      const revoked = await revokeSession(sessionId, userId);
      if (!revoked) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found or already revoked',
        });
      }
      return { message: 'Session revoked successfully', success: true };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'revoke session',
        userId,
      });
    }
  });

export const revokeAllSessions = protectedProcedure.mutation(
  async ({ ctx: { userId, res } }) => {
    try {
      const count = await revokeAllUserTokens(userId);

      // Clear current session cookies
      res
        .clearCookie('access-token', accessTokenCookieOptions)
        .clearCookie('refresh-token', refreshTokenCookieOptions);

      return {
        message: `All ${count} sessions revoked successfully`,
        success: true,
        count,
      };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'revoke all sessions',
        userId,
      });
    }
  },
);

// Admin endpoint to clean up expired tokens
export const cleanupTokens = protectedProcedure.mutation(async ({ ctx }) => {
  try {
    const result = await cleanupExpiredTokens();
    return {
      message: 'Token cleanup completed',
      ...result,
    };
  } catch (error: unknown) {
    handleControllerError(error, {
      operation: 'cleanup expired tokens',
      userId: ctx.userId,
    });
  }
});
