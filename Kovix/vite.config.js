import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    commonjsOptions: {
      transformMixedEsModules: true
    },
    rollupOptions: {
      onwarn(warning, warn) {
        if (typeof warning.message === 'string' && warning.message.includes('contains an annotation that Rollup cannot interpret')) {
          return;
        }
        warn(warning);
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      '/chatHub': {
        target: 'http://localhost:8080', 
        ws: true,
        changeOrigin: true,
      },
      '/notificationHub': {
        target: 'http://localhost:8080',
        ws: true,
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
})