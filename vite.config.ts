import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

// Fellowship V2 — pas de Tailwind, pas de PWA : uniquement React + CSS natif.
// Toute la mise en forme vit dans src/styles/ (voir docs/v2/DESIGN-SYSTEM.md).
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
