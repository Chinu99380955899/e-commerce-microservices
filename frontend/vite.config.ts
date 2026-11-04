import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:8080';

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      strictPort: true,
      // Real-backend mode forwards /api to the gateway (or catalog-service directly).
      proxy:
        mode === 'real'
          ? {
              '/api': { target: proxyTarget, changeOrigin: true },
            }
          : undefined,
    },
    preview: { port: 4173, strictPort: true },
    build: {
      sourcemap: true,
    },
  };
});
