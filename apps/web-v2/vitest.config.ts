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
    // Les tests ne dépendent jamais des vraies clés : supabase.ts lève sans elles, et le
    // .env vit à la racine du monorepo, hors de portée de la CI.
    env: {
      TZ: 'Europe/Paris',
      VITE_SUPABASE_URL: 'https://test.invalid',
      VITE_SUPABASE_ANON_KEY: 'test-placeholder',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
