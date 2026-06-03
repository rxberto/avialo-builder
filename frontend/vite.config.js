import path from "path"
import { fileURLToPath } from "url"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    // Sin sourcemap en producción: el .map exponía el código fuente completo
    // en builder.avialo.es. No hay error-tracking (Sentry) que lo requiera.
    sourcemap: false,
    rollupOptions: {
      output: {
        // Separa las librerías pesadas en chunks cacheables aparte del código
        // de la app, para que el navegador los reutilice entre despliegues.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) {
              return 'vendor-motion';
            }
            if (id.includes('react-dom') || id.includes('react-router') || /[\\/]react[\\/]/.test(id)) {
              return 'vendor-react';
            }
          }
        },
      },
    },
  },
})