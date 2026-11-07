import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

const dir = import.meta.dirname;

export default defineConfig({
  root: resolve(dir, 'src/renderer'),
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(dir, 'src/renderer'),
      '@shared': resolve(dir, 'src/shared'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: resolve(dir, 'dist/renderer'),
    emptyOutDir: true,
    target: 'chrome140',
    assetsInlineLimit: 0,
  },
});
