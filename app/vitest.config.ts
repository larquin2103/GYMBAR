import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Config de tests separada del build de producción: vitest arrastra su propia
// versión de Vite y mezclar ambas en vite.config.ts rompe los tipos de los
// plugins durante `tsc`. Este archivo no se typechequea con tsc.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
