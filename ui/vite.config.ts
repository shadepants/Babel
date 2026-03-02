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
    host: '0.0.0.0',  // bind to all interfaces: IPv4 (preview tool) + IPv6 (browser localhost)
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'esbuild', // Built-in minifier (fast and secure)
    sourcemap: false,
    target: 'es2015',
    cssMinify: true,
    rollupOptions: {
      output: {
        // Split heavy vendors into separately-cacheable chunks.
        // Each group only loads when a page that uses it is visited.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          // D3 ecosystem -- only needed by Analytics/BranchTree
          if (id.includes('/d3') || id.includes('/d3-') || id.includes('internmap') ||
              id.includes('delaunator') || id.includes('robust-predicates')) {
            return 'vendor-d3'
          }

          // Framer Motion -- animation library
          if (id.includes('/framer-motion')) return 'vendor-motion'

          // Radix UI primitives + utility belt
          if (id.includes('/@radix-ui') || id.includes('/class-variance-authority') ||
              id.includes('/clsx') || id.includes('/tailwind-merge')) {
            return 'vendor-ui'
          }

          // Lucide icons
          if (id.includes('/lucide')) return 'vendor-icons'

          // React core -- always cached across deploys.
          // Note: scheduler is intentionally NOT included here -- react-router-dom also depends
          // on it, and grouping it here creates a circular chunk warning.
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router')) {
            return 'vendor-react'
          }

          // Everything else from node_modules
          return 'vendor'
        },
      },
    },
  },
})
