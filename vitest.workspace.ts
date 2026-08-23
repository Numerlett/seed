import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    extends: 'server/vitest.config.ts',
    test: {
      include: ['server/tests/**/*.test.ts'],
    },
  },
  {
    extends: 'schemas/vitest.config.ts',
    test: {
      include: ['schemas/tests/**/*.test.ts'],
    },
  },
  {
    extends: 'server/vitest.integration.config.ts',
    test: {
      include: ['server/tests/integration/**/*.test.ts'],
    },
  },
  {
    extends: 'tax/vitest.config.ts',
    test: {
      include: ['tax/tests/**/*.test.ts'],
    },
  },
  {
    extends: 'accounting/vitest.config.ts',
    test: {
      include: ['accounting/tests/**/*.test.ts'],
    },
  },
]);
