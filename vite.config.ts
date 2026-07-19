import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { cspNonce } from './src/plugins/csp-nonce.ts'
import { uniqueMark } from './src/plugins/unique-mark.ts'

// oxlint-disable-next-line import/no-default-export
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 700,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    reportCompressedSize: false,
  },
  plugins: [react(), tailwindcss(), uniqueMark(), cspNonce()],
  preview: { port: 4300 },
  server: { port: 4200 },
  test: {
    coverage: {
      include: ['src/utils', 'src/schemas', 'src/store'],
      provider: 'v8' as const,
      reporter: [['text', { maxCols: 120 }], 'lcov'],
      reportsDirectory: './test-output/vitest/coverage',
      thresholds: { 100: true },
    },
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    pool: 'threads',
    reporters: ['dot'],
    setupFiles: ['./src/test/setup.ts'],
    silent: true,
    watch: false,
  },
})
