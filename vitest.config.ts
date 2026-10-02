import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    pool: 'threads',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@splitit/core': path.resolve(__dirname, './packages/core/src/index.ts'),
    },
  },
});
