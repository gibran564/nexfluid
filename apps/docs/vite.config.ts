import react from '@vitejs/plugin-react';
import { defineConfig, defaultClientConditions } from 'vite';

// NexDocs es un consumidor más: en build resuelve los paquetes por su `dist`
// (exports públicos); en desarrollo, por su código fuente para recargar al vuelo.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: './',
  resolve: { conditions: command === 'serve' ? ['nexfluid-source', ...defaultClientConditions] : [...defaultClientConditions] },
  server: { host: '127.0.0.1', port: 5290, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 900 },
}));
