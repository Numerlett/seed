import { t } from './index';
import { isAuthed, isBusinessMember } from './middlewares';

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
