import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 2002,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Firebase SDK separado — carregado apenas uma vez e cacheado pelo browser
          'firebase-core': ['firebase/app', 'firebase/auth'],
          'firebase-firestore': ['firebase/firestore'],
          'firebase-storage': ['firebase/storage'],
          // Ícones separados — grande biblioteca estática
          'icons': ['lucide-react'],
          // React core
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
});
