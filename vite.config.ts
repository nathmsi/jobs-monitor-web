import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // Split stable third-party code so app updates don't bust its cache.
        advancedChunks: {
          groups: [
            { name: 'supabase', test: /node_modules[\\/]@supabase/ },
            { name: 'i18n', test: /node_modules[\\/](i18next|react-i18next|i18next-browser-languagedetector)/ },
            { name: 'query', test: /node_modules[\\/]@tanstack/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Never talk to a real Supabase project from tests, whatever .env says.
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
    exclude: ['**/node_modules/**', 'e2e/**'],
  },
})
