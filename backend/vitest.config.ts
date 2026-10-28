import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    globalSetup: ['./src/tests/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      include: ['src/services/**', 'src/matching/**'],
      reporter: ['text', 'json', 'html'],
    },
  },
});
