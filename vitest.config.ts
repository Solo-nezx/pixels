import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // shadcn components import through "@/src/…", so tests need the same alias
  // the app build uses.
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    // Logic tests run in node; component tests need a DOM.
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
