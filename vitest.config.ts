import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    globals: true,
    environment: 'node', // component tests opt into jsdom via `// @vitest-environment jsdom`
    setupFiles: ['./test/setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', 'output', '.wxt', '.output'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['lib/**/*.ts', 'components/**/*.tsx', 'entrypoints/sidepanel/**/*.tsx'],
      exclude: ['**/*.test.ts', '**/*.test.tsx', 'lib/mock.ts', 'lib/types.ts'],
      thresholds: {
        // set just below measured (76/72/70/76) to enforce without being brittle
        statements: 74,
        branches: 68,
        functions: 65,
        lines: 74,
      },
    },
  },
});
