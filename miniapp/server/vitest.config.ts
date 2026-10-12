import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup-owner.ts'],
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
