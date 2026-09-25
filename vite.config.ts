import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // The production API allows cross-origin calls only from the storefront's
    // own domain. Proxying /api keeps local development same-origin, so the
    // browser never makes a cross-origin request and CORS stays as strict as
    // it is in production.
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'https://adh-api.alfredo-dominguez.dev',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
