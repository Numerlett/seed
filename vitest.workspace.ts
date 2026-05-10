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
]);
