import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/products': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/api/categories': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/api/orders': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      }
    }
  }
})
