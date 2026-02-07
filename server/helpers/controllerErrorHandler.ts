import { TRPCError } from '@trpc/server';
import { handlePrismaError } from './handlePrismaError';

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
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`❌ Error during: ${context.operation}`);
    if (context.userId) {
      console.error(`👤 User ID: ${context.userId}`);
    }
    if (error instanceof TRPCError) {
      console.error(`📍 tRPC Code: ${error.code}`);
      console.error(`💬 Message: ${error.message}`);
    }
    if (prismaInfo?.prismaCode) {
      console.error(`🔧 Prisma Code: ${prismaInfo.prismaCode}`);
      if (prismaInfo.field) {
        console.error(`📝 Field: ${prismaInfo.field}`);
      }
      if (prismaInfo.devDetails) {
        console.error(`🔍 Details: ${prismaInfo.devDetails}`);
      }
    }
    if (error.cause) {
      console.error('🐛 Cause:', error.cause);
    }
    if (error.stack && !prismaInfo) {
      console.error('📚 Stack:', error.stack);
    }
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } else {
    // Production: Log minimal information
    console.error(`Error in ${context.operation}:`, error.message);
    if (context.userId) {
      console.error(`User: ${context.userId}`);
    }
  }
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
