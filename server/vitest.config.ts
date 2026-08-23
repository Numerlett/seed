import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'server',
    environment: 'node',
    // Integration tests need a real database, so they cannot use the setup
    // file below — it mocks @seed/database for every test in the project.
    include: ['tests/unit/**/*.test.ts'],
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
