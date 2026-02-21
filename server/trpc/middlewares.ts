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
