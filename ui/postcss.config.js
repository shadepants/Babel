import { fileURLToPath } from 'url'
import path from 'path'

// Must use import.meta.url here: when Vite launches from the repo root,
// process.cwd() is the repo root -- NOT ui/. Tailwind would look for
// tailwind.config.js in the wrong directory and fall back to empty defaults.
// Passing an absolute path forces Tailwind to load the correct config file.
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default {
  plugins: {
    tailwindcss: { config: path.join(__dirname, 'tailwind.config.js') },
    autoprefixer: {},
  },
}
