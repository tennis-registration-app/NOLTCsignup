import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setupTests.ts'],
    include: ['tests/unit/**/*.test.{js,jsx,ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json-summary'],
      include: ['src/**/*.{js,jsx,ts,tsx}', 'public/domain/**/*.js'],
      exclude: ['**/node_modules/**', '**/tests/**', '**/*.test.*', '**/*.d.ts'],
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
