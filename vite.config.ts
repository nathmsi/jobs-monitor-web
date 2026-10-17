import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

import { seoPages } from './vite.seo.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), seoPages()],
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
    setupFiles: ['./tests/support/setup.ts'],
    // Never talk to a real Supabase project from tests, whatever .env says.
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
    exclude: ['**/node_modules/**', 'e2e/**'],
    // The three Vitest levels (see tests/README.md). Playwright (e2e/) is separate.
    projects: [
      {
        // Logic, no React: next to the code as Foo.test.ts, the Vercel functions (api/), and the tests of the test helpers.
        extends: true,
        test: { name: 'unit', include: ['src/**/*.test.ts', 'api/**/*.test.ts', 'tests/support/**/*.test.ts'] },
      },
      {
        // One component or hook, with Testing Library: next to the code as Foo.test.tsx.
        extends: true,
        test: { name: 'component', include: ['src/**/*.test.tsx'] },
      },
      {
        // A whole page or flow with the real providers and a mocked network: tests/integration/<feature>/.
        extends: true,
        test: { name: 'integration', include: ['tests/integration/**/*.test.tsx'], testTimeout: 15_000 },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.*', 'src/main.tsx', 'src/**/*.d.ts', 'src/assets/**', 'src/i18n/locales/**'],
      reporter: ['text-summary', 'html'],
    },
  },
})
