import { defineConfig } from 'vite'

export default defineConfig({
  base: '/hsl-ticket-optimizer/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  test: {
    environment: 'jsdom',
    globals: true
  }
})
