import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// BASE_PATH is intentionally NOT prefixed with VITE_ so it is only used at
// build time by Vite and is never embedded into the client bundle via
// import.meta.env. Set it in CI (e.g. GitHub Actions) to /<repo-name>/ for
// GitHub Pages. Leave it unset for local development.
const base = process.env.BASE_PATH?.trim() || '/'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Expose the base path to the router as a build-time constant.
    // In local dev this will always be '/' regardless of any env variable.
    __BASE_PATH__: JSON.stringify(base),
  },
  base: '/yipbrother-prototype/',
})
