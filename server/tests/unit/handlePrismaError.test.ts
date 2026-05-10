import { describe, it, expect, vi } from 'vitest';

// Use the real Prisma classes for error construction; only mock prisma client
vi.mock('@seed/database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@seed/database')>();
  return {
    ...actual,
    prisma: {
      user: { findUnique: vi.fn() },
    },
  };
});

import { Prisma } from '@seed/database';
import { handlePrismaError } from '../../helpers/handlePrismaError';

function makePrismaKnownError(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError('msg', {
    code,
    clientVersion: '5.x',
    meta,
  });
}

describe('handlePrismaError', () => {
  it('maps P2002 to CONFLICT', () => {
    const info = handlePrismaError(makePrismaKnownError('P2002', { target: ['email'] }));
    expect(info.code).toBe('CONFLICT');
    expect(info.isDuplicateError).toBe(true);
  });

  it('maps P2025 to NOT_FOUND', () => {
    const info = handlePrismaError(makePrismaKnownError('P2025'));
    expect(info.code).toBe('NOT_FOUND');
  });

  it('maps P2001 to NOT_FOUND', () => {
    const info = handlePrismaError(makePrismaKnownError('P2001'));
    expect(info.code).toBe('NOT_FOUND');
  });

  it('maps unknown prisma code to INTERNAL_SERVER_ERROR', () => {
    const info = handlePrismaError(makePrismaKnownError('P9999'));
    expect(info.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('maps PrismaClientValidationError to BAD_REQUEST', () => {
    const err = new Prisma.PrismaClientValidationError('bad input', {
      clientVersion: '5.x',
    });
    const info = handlePrismaError(err);
    expect(info.code).toBe('BAD_REQUEST');
  });

  it('maps non-prisma Error to INTERNAL_SERVER_ERROR', () => {
    const info = handlePrismaError(new Error('something broke'));
    expect(info.code).toBe('INTERNAL_SERVER_ERROR');
    expect(info.message).toBe('An unexpected error occurred');
  });
});
