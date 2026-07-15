// vite.config.ts - Add proxy to forward /api/* to Flask on port 5001

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',

      // ── Proxy all /api requests to Flask ───────────────────────────────────
      proxy: {
        '/api': {
          target: 'http://localhost:5001',
          changeOrigin: true,
          secure: false,
          // Log proxy activity so you can confirm requests are forwarded
          configure: (proxy) => {
            proxy.on('error', (err) => {
              console.error('[proxy] error:', err.message);
            });
            proxy.on('proxyReq', (_proxyReq, req) => {
              console.log(`[proxy] ${req.method} ${req.url} → http://localhost:5001`);
            });
          },
        },
      },
    },
  };
});