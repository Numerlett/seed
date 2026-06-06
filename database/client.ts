import 'dotenv/config';
import { PrismaClient } from './generated/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  idleTimeoutMillis: 10_000,
});

// Use globalThis for broader environment compatibility
const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

// Named export with global memoization
export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
