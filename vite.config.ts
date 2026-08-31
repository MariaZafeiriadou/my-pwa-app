import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({ 
      registerType: 'autoUpdate',
      injectRegister: 'inline', // Αυτό βοηθάει στην άμεση ενεργοποίηση
      manifest: {
        name: 'TrackSync Enterprise',
        short_name: 'TrackSync',
        description: 'Enterprise Grade Offline Music Player',
        theme_color: '#0f1120',
        background_color: '#0f1120',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      devOptions: {
        enabled: true // Αυτό είναι ΚΡΙΣΙΜΟ για να βλέπεις το PWA ενώ προγραμματίζεις (npm run dev)
      }
    })
  ],
})