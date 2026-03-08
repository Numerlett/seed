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
