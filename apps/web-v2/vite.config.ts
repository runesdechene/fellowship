import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string }

// La version publiée, relue par les onglets ouverts : une autre que la leur fait paraître le
// bandeau « Recharger » (components/layout/UpdateBanner.tsx, lot 12).
const versionFile: Plugin = {
  name: 'version-json',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify({ version: pkg.version }),
    })
  },
}

// Fellowship V2 — pas de Tailwind, pas de PWA : uniquement React + CSS natif.
// Toute la mise en forme vit dans src/styles/ (voir docs/v2/DESIGN-SYSTEM.md).
// Servie à la racine de flw.sh depuis la bascule (lot 12, 19/10/2026) ; la V1 n'est plus servie.
export default defineConfig({
  base: '/',
  envDir: path.resolve(__dirname, '../..'),
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react(), versionFile],
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
