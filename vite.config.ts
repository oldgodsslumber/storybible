import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// `base` controls the public path under which the built assets are served.
// On GitHub Pages the site lives at /storybible/, so production builds need
// that prefix. Local dev (`npm run dev`) is served at /, so we leave it
// alone there to avoid double-prefix breakage.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/storybible/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Story Bible',
        short_name: 'StoryBible',
        description: 'Spatial story bible for writers',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: { port: 5173 },
}));
