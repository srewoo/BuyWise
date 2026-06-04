import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// Standalone Vite app to preview the screen designs in a browser (not the extension build).
export default defineConfig({
  root: fileURLToPath(new URL('./gallery', import.meta.url)),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  server: { port: 5199, host: true },
});
