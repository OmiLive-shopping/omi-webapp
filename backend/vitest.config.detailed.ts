import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    reporters: ['verbose'],
    outputFile: './test-results.json',
    logHeapUsage: true,
    passWithNoTests: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});