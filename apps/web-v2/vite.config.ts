import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string }

// Fellowship V2 — pas de Tailwind, pas de PWA : uniquement React + CSS natif.
// Toute la mise en forme vit dans src/styles/ (voir docs/v2/DESIGN-SYSTEM.md).
// Servie à la racine de flw.sh depuis la bascule (lot 12, 19/10/2026) ; la V1 n'est plus servie.
export default defineConfig({
  base: '/',
  envDir: path.resolve(__dirname, '../..'),
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
