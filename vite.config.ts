import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  build: {
    target: 'es2022',
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'physics', test: /rapier/ },
            { name: 'three', test: /node_modules[\\/]three/ },
          ],
        },
      },
    },
    chunkSizeWarningLimit: 2500,
  },
});
