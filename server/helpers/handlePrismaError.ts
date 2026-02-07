import { Prisma } from '@seed/database';
import { TRPCError } from '@trpc/server';

/**
 * Enhanced error information returned by the Prisma error handler
 */
export interface PrismaErrorInfo {
  code: TRPCError['code'];
  status: number;
  message: string;
  prismaCode?: string;
  isDuplicateError?: boolean;
  field?: string;
  devDetails?: string;
}

/**
 * Handles Prisma errors and converts them to standardized tRPC error information
 *
 * @param error - The error thrown by Prisma
 * @param options - Additional options for error handling
 * @returns Standardized error information
 *
 * @example
 * ```typescript
 * try {
 *   await prisma.user.create({ data: { email: 'duplicate@example.com' } });
 * } catch (error) {
 *   const { code, message } = handlePrismaError(error);
 *   throw new TRPCError({ code, message });
 * }
 * ```
 */
export function handlePrismaError(
  error: unknown,
  options?: { includeDev?: boolean },
): PrismaErrorInfo {
  const isDev = options?.includeDev ?? process.env.NODE_ENV !== 'production';

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const meta = error.meta as Record<string, unknown> | undefined;

    switch (error.code) {
      case 'P2000': {
        // Value too long for column
        const field = meta?.column_name as string | undefined;
        return {
          prismaCode: error.code,
          code: 'BAD_REQUEST',
          status: 400,
          message: field
            ? `Value provided for field '${field}' is too long`
            : 'Value provided is too long for the database column',
          field,
          devDetails: isDev ? error.message : undefined,
        };
      }

      case 'P2001': {
        // Record does not exist in where condition
        const cause = meta?.cause as string | undefined;
        return {
          prismaCode: error.code,
          code: 'NOT_FOUND',
          status: 404,
          message:
            cause ||
            'The record searched for in the where condition does not exist',
          devDetails: isDev ? error.message : undefined,
        };
      }

      case 'P2002': {
        // Unique constraint violation
        const target = meta?.target as string[] | string | undefined;
        const field = Array.isArray(target) ? target.join(', ') : target;
        return {
          prismaCode: error.code,
          code: 'CONFLICT',
          status: 409,
          message: field
            ? `A record with this ${field} already exists`
            : 'A record with these values already exists',
          field,
          isDuplicateError: true,
          devDetails: isDev ? error.message : undefined,
        };
      }

      case 'P2003': {
        // Foreign key constraint violation
        const field = meta?.field_name as string | undefined;
        return {
          prismaCode: error.code,
          code: 'BAD_REQUEST',
          status: 400,
          message: field
            ? `Invalid reference for field '${field}'`
            : 'Invalid relation reference',
          field,
          devDetails: isDev ? error.message : undefined,
        };
      }

      case 'P2014': {
        // Required relation violation
        const relation = meta?.relation_name as string | undefined;
        return {
          prismaCode: error.code,
          code: 'BAD_REQUEST',
          status: 400,
          message: relation
            ? `The change violates the required relation '${relation}'`
            : 'The change violates a required relation',
          devDetails: isDev ? error.message : undefined,
        };
      }

      case 'P2015': {
        // Related record not found
        const relation = meta?.relation_name as string | undefined;
        return {
          prismaCode: error.code,
          code: 'NOT_FOUND',
          status: 404,
          message: relation
            ? `Related record not found for relation '${relation}'`
            : 'Related record not found',
          devDetails: isDev ? error.message : undefined,
        };
      }

      case 'P2016': {
        // Query interpretation error
        return {
          prismaCode: error.code,
          code: 'BAD_REQUEST',
          status: 400,
          message: 'Query interpretation error',
          devDetails: isDev ? error.message : undefined,
        };
      }

      case 'P2004': {
        // Constraint violation
        return {
          prismaCode: error.code,
          code: 'BAD_REQUEST',
          status: 400,
          message: 'A database constraint was violated',
          devDetails: isDev ? error.message : undefined,
        };
      }

      case 'P2011': {
        // Null constraint violation
        const field = meta?.column as string | undefined;
        return {
          prismaCode: error.code,
          code: 'BAD_REQUEST',
          status: 400,
          message: field
            ? `Field '${field}' cannot be null`
            : 'A required field is missing',
          field,
          devDetails: isDev ? error.message : undefined,
        };
      }

      case 'P2012': {
        // Missing required value
        const field = meta?.path as string | undefined;
        return {
          prismaCode: error.code,
          code: 'BAD_REQUEST',
          status: 400,
          message: field
            ? `Missing required value for '${field}'`
            : 'Missing a required value',
          field,
          devDetails: isDev ? error.message : undefined,
        };
      }

      case 'P2013': {
        // Missing required argument
        const argument = meta?.argument_name as string | undefined;
        return {
          prismaCode: error.code,
          code: 'BAD_REQUEST',
          status: 400,
          message: argument
            ? `Missing required argument '${argument}'`
            : 'Missing a required argument',
          devDetails: isDev ? error.message : undefined,
        };
      }

      case 'P2019': {
        // Input error
        return {
          prismaCode: error.code,
          code: 'BAD_REQUEST',
          status: 400,
          message: 'Invalid input provided',
          devDetails: isDev ? error.message : undefined,
        };
      }

      case 'P2020': {
        // Value out of range
        const field = meta?.column as string | undefined;
        return {
          prismaCode: error.code,
          code: 'BAD_REQUEST',
          status: 400,
          message: field
            ? `Value for '${field}' is out of range`
            : 'A value is out of the acceptable range',
          field,
          devDetails: isDev ? error.message : undefined,
        };
      }

      case 'P2022': {
        // Column does not exist
        const column = meta?.column as string | undefined;
        return {
          prismaCode: error.code,
          code: 'INTERNAL_SERVER_ERROR',
          status: 500,
          message: 'Database configuration error',
          devDetails: isDev
            ? column
              ? `Column '${column}' does not exist in the database`
              : error.message
            : undefined,
        };
      }

      case 'P2023': {
        // Inconsistent column data
        return {
          prismaCode: error.code,
          code: 'INTERNAL_SERVER_ERROR',
          status: 500,
          message: 'Database data inconsistency detected',
          devDetails: isDev ? error.message : undefined,
        };
      }

      case 'P2021': {
        // Table does not exist
        const table = meta?.table as string | undefined;
        return {
          prismaCode: error.code,
          code: 'INTERNAL_SERVER_ERROR',
          status: 500,
          message: 'Database configuration error',
          devDetails: isDev
            ? table
              ? `Table '${table}' does not exist in the database`
              : error.message
            : undefined,
        };
      }

      case 'P2024': {
        // Connection pool timeout
        return {
          prismaCode: error.code,
          code: 'TIMEOUT',
          status: 408,
          message: 'Database connection timeout. Please try again.',
          devDetails: isDev ? error.message : undefined,
        };
      }

      case 'P2025': {
        // Record to update/delete not found
        const cause = meta?.cause as string | undefined;
        return {
          prismaCode: error.code,
          code: 'NOT_FOUND',
          status: 404,
          message: cause || 'Record not found',
          devDetails: isDev ? error.message : undefined,
        };
      }

      default: {
        // Unknown Prisma error code
        return {
          prismaCode: error.code,
          code: 'INTERNAL_SERVER_ERROR',
          status: 500,
          message: 'A database error occurred',
          devDetails: isDev
            ? `Prisma Error ${error.code}: ${error.message}`
            : undefined,
        };
      }
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      prismaCode: 'VALIDATION_ERROR',
      code: 'BAD_REQUEST',
      status: 422,
      message: 'Invalid input data provided',
      devDetails: isDev ? error.message : undefined,
    };
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      prismaCode: 'INITIALIZATION_ERROR',
      code: 'INTERNAL_SERVER_ERROR',
      status: 503,
      message: 'Database connection failed',
      devDetails: isDev ? error.message : undefined,
    };
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return {
      prismaCode: 'RUST_PANIC',
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
      message: 'A critical database error occurred',
      devDetails: isDev ? error.message : undefined,
    };
  }

  // Unknown error type
  const devDetails =
    isDev && error instanceof Error
      ? `${error.message}${error.stack ? '\n' + error.stack : ''}`
      : undefined;

  return {
    code: 'INTERNAL_SERVER_ERROR',
    status: 500,
    message: 'An unexpected error occurred',
    devDetails,
  };
}
