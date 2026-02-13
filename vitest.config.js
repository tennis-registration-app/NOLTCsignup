import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      include: ['src/**/*.{js,jsx}', 'public/domain/**/*.js'],
      exclude: ['**/node_modules/**', '**/tests/**', '**/*.test.*'],
    },
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, './shared'),
      '@domain': resolve(__dirname, './domain'),
      '@lib': resolve(__dirname, './src/lib'),
    },
  },
});
