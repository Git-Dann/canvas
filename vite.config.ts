import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// Same build contract as Foundry Deck: SINGLEFILE=1 inlines every script, style
// and font into one HTML file. That file IS the app and, once saved, the artwork.
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [...(process.env.SINGLEFILE ? [viteSingleFile()] : [])],
  build: {
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 4096,
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
} as any)
