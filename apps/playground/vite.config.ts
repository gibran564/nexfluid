import { defineConfig, defaultClientConditions } from 'vite';

// En desarrollo se consume el código fuente de los paquetes; en build, su dist (como un consumidor externo).
export default defineConfig(({ command }) => ({
  resolve: { conditions: command === 'serve' ? ['nexfluid-source', ...defaultClientConditions] : [...defaultClientConditions] },
  server: { host: '127.0.0.1', port: 5288, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true },
}));
