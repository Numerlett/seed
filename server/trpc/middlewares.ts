import { TRPCError } from '@trpc/server';
import { t } from './index';
import jwt from 'jsonwebtoken';
import { accessSecret } from '../helpers/auth';
import { AccessTokenPayload } from '../types/auth';
import { prisma } from '@seed/database';
import * as z from 'zod';

export const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.accessToken) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(
      ctx.accessToken,
      accessSecret,
    ) as AccessTokenPayload;
    return next({
      ctx: {
        userId: decoded.id,
      },
    });
  } catch (error) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Invalid or expired token',
      cause: error,
    });
  }
});

/**
 * Middleware that verifies the authenticated user is a member of the business
 * specified in the input. Injects `businessId` and `memberRole` into context.
 *
 * Expects the procedure input to contain `businessId: string`.
 */
export const isBusinessMember = t.middleware(
  async ({ ctx, next, getRawInput }) => {
    const rawInput = await getRawInput();
    const parsed = z.object({ businessId: z.string() }).safeParse(rawInput);

    if (!parsed.success) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'businessId is required',
      });
    }

    const { businessId } = parsed.data;
    const userId = (ctx as any).userId as string | undefined;

    if (!userId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const membership = await prisma.businessMembership.findUnique({
      where: {
        userId_businessId: { userId, businessId },
      },
      select: { role: true },
    });

    if (!membership) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You are not a member of this business',
      });
    }

    return next({
      ctx: {
        userId,
        businessId,
        memberRole: membership.role,
      },
    });
  },
);

/**
 * Middleware that verifies the authenticated user is a platform admin.
 * Must be chained after `isAuthed` — uses `ctx.userId` to look up the Admin table.
 * Injects `adminId` and `isSuperAdmin` into context.
 */
export const isAdmin = t.middleware(async ({ ctx, next }) => {
  const userId = (ctx as any).userId as string | undefined;

  if (!userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  const admin = await prisma.admin.findUnique({
    where: { userId },
    select: { id: true, isActive: true, isSuperAdmin: true },
  });

  if (!admin || !admin.isActive) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }

  return next({
    ctx: {
      userId,
      adminId: admin.id,
      isSuperAdmin: admin.isSuperAdmin,
    },
  });
});

/**
 * Middleware that verifies the admin is a super admin.
 * Must be chained after `isAdmin`.
 */
export const isSuperAdminMiddleware = t.middleware(({ ctx, next }) => {
  const isSuperAdmin = (ctx as any).isSuperAdmin as boolean | undefined;

  if (!isSuperAdmin) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Super admin access required',
    });
  }

  return next({ ctx });
});
