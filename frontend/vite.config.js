import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Every request starting with /api → forward to FastAPI on 8000
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        // rewrite is NOT needed — /api prefix must be kept so FastAPI routes match
      },
    },
  },
})
