import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Ejecutar con "npm test" (usa scripts/vitest.mjs, que corrige la ruta en Windows).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
