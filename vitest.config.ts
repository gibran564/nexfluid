import react from '@vitejs/plugin-react';
import { defaultClientConditions } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: { conditions: ['nexfluid-source', ...defaultClientConditions] },
  test: {
    environment: 'jsdom',
    include: ['packages/react/tests/**/*.test.tsx', 'packages/sheets/tests/**/*.test.ts', 'apps/docs/tests/**/*.test.tsx'],
    css: false,
  },
});
