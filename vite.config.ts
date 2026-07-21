import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA as vitePwa } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'
import { cspNonce } from './src/plugins/csp-nonce.ts'
import { uniqueMark } from './src/plugins/unique-mark.ts'

// oxlint-disable-next-line import/no-default-export
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 700,
    reportCompressedSize: false,
    rolldownOptions: {
      output: {
        manualChunks(id: string) {
          const packageMatch = /\/node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?(?<packageName>@[^/]+\/[^/]+|[^/]+)\//.exec(id)
          const packageName = packageMatch?.groups?.packageName
          if (packageName === undefined) return undefined
          if (packageName === 'react' || packageName === 'react-dom' || packageName === 'scheduler') return 'vendor-react'
          if (packageName.startsWith('react-router')) return 'vendor-router'
          if (
            packageName.startsWith('@radix-ui') ||
            packageName.startsWith('@floating-ui') ||
            packageName === 'react-remove-scroll' ||
            packageName === 'react-remove-scroll-bar' ||
            packageName === 'use-sidecar' ||
            packageName === 'aria-hidden'
          )
            return 'vendor-radix'
          if (packageName === 'dexie') return 'vendor-dexie'
          if (packageName === 'zod') return 'vendor-zod'
          // convex is dynamically imported from two places (src/db/use-sync.ts's `convex/react`,
          // src/db/sync-client.utils.ts's `convex/browser`) — do NOT give it an explicit chunk
          // name here. Doing so (even just to fix the confusing auto-generated `react-*.js` name
          // Rollup picks for the `convex/react` chunk — it derives it from that subpath's own
          // `.../dist/esm/react/index.js` facade) merges both dynamic-import entry points into one
          // chunk that Vite then eagerly `modulepreload`s from index.html, defeating the whole
          // point: verified twice by rebuilding and grepping dist/index.html's modulepreload tags.
          // Returning undefined keeps them as two separate, genuinely lazy chunks instead.
          if (packageName === 'convex') return undefined
          return 'vendor-others'
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    uniqueMark(),
    cspNonce(),
    vitePwa({
      // manifest is already hand-authored and linked from index.html as /app.webmanifest
      manifest: false,
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,mp3}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
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
    include: ['src/**/*.test.{ts,tsx}', 'convex/**/*.test.ts'],
    pool: 'threads',
    reporters: ['dot'],
    setupFiles: ['./src/test/setup.ts'],
    silent: true,
    watch: false,
  },
})
