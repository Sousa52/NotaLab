import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  // Only the production build (and its preview) is served from the /NotaLab/
  // subpath on GitHub Pages. `vite build` and `vite preview` both run in
  // production mode, while `vite dev` runs in development mode — checking
  // `command` instead of `mode` here was the bug: preview shares dev's
  // command ('serve'), so it was serving the /NotaLab/-prefixed build output
  // as if it lived at the root, and every asset 404'd.
  base: mode === 'production' ? '/NotaLab/' : '/',
  build: {
    rollupOptions: {
      output: {
        // PDF.js (PDF para JPG) looks for its WebAssembly decoders (JPEG 2000, JBIG2, colour
        // profiles) by their original file names inside one folder, so these three files are
        // emitted without a content hash. Everything else keeps the default hashed names.
        assetFileNames: (asset) =>
          asset.names.some((name) => /^(openjpeg|jbig2|qcms_bg)\.wasm$/.test(name))
            ? 'assets/pdfjs/[name][extname]'
            : 'assets/[name]-[hash][extname]',
      },
    },
  },
}))
