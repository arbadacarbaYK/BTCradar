import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['bitcoin-icon.svg', 'favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'BTCradar',
        short_name: 'BTCradar',
        description: 'Bitcoin event location sharing for attendees',
        theme_color: '#F7931A',
        background_color: '#0F172A',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/unpkg\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'leaflet-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tile-cache',
              expiration: {
                maxEntries: 1000,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/btcmap\.org\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'btcmap-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 1 // 1 hour
              }
            }
          }
        ]
      }
    })
  ],
  optimizeDeps: {
    exclude: ['lucide-react']
  },
  server: {
    host: true, // Listen on all available network interfaces
    port: 5173,
    strictPort: true, // Use consistent port
    proxy: {
      // Proxy for BTCMap API: /api/btcmap/* -> https://api.btcmap.org/*
      '/api/btcmap': {
        target: 'https://api.btcmap.org',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/btcmap/, ''),
      },
    },
    cors: true,
    hmr: {
      clientPort: 5173,
      host: 'localhost'
    }
  },
  preview: {
    host: true,
    port: 5173,
    strictPort: true
  },
  define: {
    'import.meta.env.VITE_BTCMAP_API_URL': JSON.stringify('/api/btcmap'),
  },
});