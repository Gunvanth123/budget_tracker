import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Budget Tracker',
        short_name: 'Budget',
        description: 'Smart Financial Planning',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 4000000
      },
      devOptions: {
        enabled: true
      }
    })
  ],
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
