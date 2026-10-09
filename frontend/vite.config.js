import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

<<<<<<< HEAD
// https://vite.dev/config/
=======
>>>>>>> 17754b7be8a5b66f0630fde4c63ffb905fb08b5b
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
<<<<<<< HEAD
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
=======
    // In development the browser talks to Vite, which forwards /api to the Express server.
    proxy: { '/api': { target: process.env.VITE_PROXY_TARGET || 'http://localhost:5000', changeOrigin: true } },
  },
  test: { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.js', css: false },
>>>>>>> 17754b7be8a5b66f0630fde4c63ffb905fb08b5b
});
