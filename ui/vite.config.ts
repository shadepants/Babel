import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false, // Prevents original code from being visible in DevTools
    minify: 'terser', // Advanced minification (if you install terser) or 'esbuild' (default)
    terserOptions: {
      compress: {
        drop_console: true, // Optional: remove logs for the external audience
        drop_debugger: true,
      }
    }
  },
})
