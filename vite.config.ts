import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  server: {
    port: 2002,
    host: true,
  },
});
