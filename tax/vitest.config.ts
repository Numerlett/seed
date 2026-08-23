import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'tax',
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['*.ts'],
      exclude: ['index.ts', 'types.ts', 'vitest.config.ts'],
    },
  },
});
