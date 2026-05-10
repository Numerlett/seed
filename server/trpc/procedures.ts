import { TRPCError } from '@trpc/server';
import { t } from './index';
import {
  isAuthed,
  isBusinessMember,
  isAdmin,
  isSuperAdminMiddleware,
} from './middlewares';

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(isAuthed);

/**
 * Procedure for features that require the long-running deployment
 * (BullMQ workers / scheduled jobs). Rejects calls with NOT_IMPLEMENTED
 * when DEPLOYMENT_MODE=serverless. Chain after isAuthed when needed.
 */
export const longRunningOnlyProcedure = t.procedure.use(({ next }) => {
  if (process.env.DEPLOYMENT_MODE === 'serverless') {
    throw new TRPCError({
      code: 'NOT_IMPLEMENTED',
      message:
        'This feature requires the long-running deployment. It is not available in serverless mode.',
    });
  }
  return next();
});

/**
 * Procedure that requires authentication AND business membership.
 * Adds `businessId` and `memberRole` to context.
 * Input MUST include `businessId: string`.
 */
export const businessMemberProcedure = t.procedure
  .use(isAuthed)
  .use(isBusinessMember);

/**
 * Procedure that requires user authentication + admin role.
 * Chains isAuthed → isAdmin. Adds `adminId` and `isSuperAdmin` to context.
 * Verifies admin exists and is active in DB on every request.
 */
export const adminProcedure = t.procedure.use(isAuthed).use(isAdmin);

/**
 * Procedure that requires user authentication + super admin role.
 * Chains isAuthed → isAdmin → isSuperAdminMiddleware.
 * Rejects non-super-admin requests with FORBIDDEN.
 */
export const superAdminProcedure = t.procedure
  .use(isAuthed)
  .use(isAdmin)
  .use(isSuperAdminMiddleware);
