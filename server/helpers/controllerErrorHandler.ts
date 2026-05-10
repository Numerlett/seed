import { TRPCError } from '@trpc/server';
import { handlePrismaError } from './handlePrismaError';
import { logger } from './logger';

/**
 * Context information for error handling
 */
export interface ErrorContext {
  /** The operation being performed (e.g., "fetch categories", "create product") */
  operation: string;
  /** Optional fallback message if no specific error handler matches */
  fallbackMessage?: string;
  /** Optional user ID for logging purposes */
  userId?: string;
}

/**
 * Standardized error handler for all controllers
 *
 * This function provides consistent error handling across the application by:
 * - Passing through existing TRPCErrors without modification
 * - Converting Prisma errors to appropriate tRPC errors
 * - Providing context-aware error messages
 * - Logging errors appropriately
 *
 * @param error - The error that was caught
 * @param context - Context information about the operation
 * @throws {TRPCError} Always throws a TRPCError
 *
 * @example
 * ```typescript
 * try {
 *   const user = await prisma.user.findUnique({ where: { id } });
 * } catch (error) {
 *   handleControllerError(error, {
 *     operation: 'fetch user',
 *     userId: currentUserId
 *   });
 * }
 * ```
 */
export function handleControllerError(
  error: unknown,
  context: ErrorContext,
): never {
  // If it's already a TRPCError, preserve it (don't double-wrap)
  if (error instanceof TRPCError) {
    // Log for debugging but don't modify the error
    logError(error, context);
    throw error;
  }

  // Handle Prisma errors with enhanced error information
  const prismaErrorInfo = handlePrismaError(error, { includeDev: true });

  // Construct detailed message - prefer Prisma-specific errors when available
  let message: string;
  if (context.fallbackMessage && !prismaErrorInfo.message) {
    // Use fallback only if Prisma didn't provide a message
    message = context.fallbackMessage;
  } else if (prismaErrorInfo.message) {
    // Use Prisma message, optionally prefix with operation context
    message = context.fallbackMessage
      ? context.fallbackMessage
      : `Failed to ${context.operation}: ${prismaErrorInfo.message}`;
  } else {
    // Default fallback
    message = `Failed to ${context.operation}`;
  }

  // Log the error with context
  const trpcError = new TRPCError({
    code: prismaErrorInfo.code,
    message,
    cause: error,
  });

  logError(trpcError, context, prismaErrorInfo);
  throw trpcError;
}

/**
 * Logs error information based on environment
 *
 * @param error - The error to log
 * @param context - Context information about the operation
 * @param prismaInfo - Optional Prisma error information
 */
function logError(
  error: TRPCError | Error,
  context: ErrorContext,
  prismaInfo?: ReturnType<typeof handlePrismaError>,
): void {
  const logData: Record<string, unknown> = {
    operation: context.operation,
    userId: context.userId,
    message: error.message,
    ...(error instanceof TRPCError && { trpcCode: error.code }),
    ...(prismaInfo?.prismaCode && {
      prismaCode: prismaInfo.prismaCode,
      prismaField: prismaInfo.field,
    }),
    cause: error.cause,
  };

  logger.error(logData, `Error during: ${context.operation}`);
}

/**
 * Helper to create a standardized context object
 *
 * @param operation - The operation being performed
 * @param additionalContext - Additional context properties
 * @returns ErrorContext object
 */
export function createErrorContext(
  operation: string,
  additionalContext?: Partial<Omit<ErrorContext, 'operation'>>,
): ErrorContext {
  return {
    operation,
    ...additionalContext,
  };
}
