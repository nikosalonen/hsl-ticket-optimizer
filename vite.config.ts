import { defineConfig } from 'vite'

export default defineConfig({
  base: '/hsl-ticket-optimizer/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'es2020'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  server: {
    port: 3000,
    open: true
  }
})
