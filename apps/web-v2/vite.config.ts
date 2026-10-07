import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string }

// Fellowship V2 — pas de Tailwind, pas de PWA : uniquement React + CSS natif.
// Toute la mise en forme vit dans src/styles/ (voir docs/v2/DESIGN-SYSTEM.md).
// Servie sous /v2/ : `base` préfixe tous les fichiers générés. En dev, le proxy sert la V1
// sur le même port : lancer `pnpm dev` ET `pnpm dev:v2`, puis tout ouvrir sur :5174.
export default defineConfig({
  base: '/v2/',
  envDir: path.resolve(__dirname, '../..'),
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '^/(?!v2(/|$)).*': { target: 'http://localhost:5173', ws: true },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
