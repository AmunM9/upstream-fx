import { defineConfig } from 'vite'

// Playground / demo site. The npm package builds use vite.lib.config.ts and vite.cdn.config.ts.
export default defineConfig({
  build: {
    outDir: 'site',
    emptyOutDir: true,
  },
})
