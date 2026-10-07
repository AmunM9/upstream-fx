import { defineConfig } from 'vite'

export default defineConfig({
  // public/ holds the demo's registry files; keep it out of the npm package.
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: false,
    lib: {
      entry: 'src/cdn.ts',
      name: 'Upstream',
      formats: ['iife'],
      fileName: () => 'upstream.global.js',
    },
  },
})
