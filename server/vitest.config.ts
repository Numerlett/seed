import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'server',
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['helpers/**/*.ts', 'controllers/**/*.ts', 'routers/**/*.ts'],
      exclude: [
        'helpers/email-templates/**',
        'helpers/aws/**',
        '**/*.d.ts',
        'vitest.config.ts',
      ],
    },
  },
});
