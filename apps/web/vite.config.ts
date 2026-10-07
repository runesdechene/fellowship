import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Fellowship',
        short_name: 'Fellowship',
        description: 'Gestionnaire d\'événements pour professionnels',
        theme_color: '#f5f0e8',
        background_color: '#f5f0e8',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Pages PUBLIQUES partagées (embed iframe + pages événement) : toujours servies
        // fraîches depuis le réseau, jamais le shell précaché du SW.
        //  - /:slug/embed : sinon le shell racine porte `frame-ancestors 'none'` → iframe bloquée.
        //  - /e/:slug & /evenement/:id : liens partagés/embed → éviter de servir une version périmée.
        navigateFallbackDenylist: [/\/embed(?:$|\?)/, /\/e\//, /\/evenement\//],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
