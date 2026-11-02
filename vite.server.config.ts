import { defineConfig } from 'vite';
export default defineConfig({ publicDir: false, build: { ssr: 'src/network/server.ts', outDir: 'server-dist', emptyOutDir: true, target: 'node22',
  rolldownOptions: { output: { entryFileNames: 'server.mjs' } } } });
