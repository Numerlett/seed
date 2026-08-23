import { defineConfig } from 'vitest/config';

/**
 * Integration tests run against a real Postgres instance and deliberately do
 * not load `tests/setup.ts`, which mocks `@seed/database`.
 *
 * They skip themselves when no database is configured (see
 * `tests/integration/setup.ts`), so `pnpm test` still works on a machine
 * without one. CI provides a Postgres service, so they run there.
 */
export default defineConfig({
  test: {
    name: 'server-integration',
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    // Shared database: run files serially so fixtures cannot collide.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
