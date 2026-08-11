import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    // Fuseau épinglé : plusieurs helpers de dates (todayIso, parseDay,
    // startOfDay) n'existent que pour éviter les décalages UTC. Sur un runner
    // en UTC, leurs tests de régression passeraient contre le bug même
    // qu'ils surveillent. Europe/Paris = le fuseau des utilisateurs.
    env: { TZ: 'Europe/Paris' },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
