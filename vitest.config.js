import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.js'],
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, './shared'),
      '@domain': resolve(__dirname, './domain'),
      '@lib': resolve(__dirname, './src/lib'),
    },
  },
});
