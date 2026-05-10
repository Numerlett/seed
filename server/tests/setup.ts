import { vi } from 'vitest';

// Mock @seed/database so unit tests never hit a real DB
vi.mock('@seed/database', () => {
  const mockPrisma = {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    otp: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    refreshToken: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    admin: { findUnique: vi.fn() },
    businessMembership: { findUnique: vi.fn() },
    $transaction: vi.fn((arg: unknown) =>
      typeof arg === 'function' ? arg(mockPrisma) : Promise.all(arg as Promise<unknown>[]),
    ),
  };

  return { prisma: mockPrisma };
});

// Stub env vars that helpers read at module init time
process.env.ACCESS_TOKEN_SECRET = 'test-access-secret-32-characters-long!!';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-32-chars-long!!!!!';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.NODE_ENV = 'test';
