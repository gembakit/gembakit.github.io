import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// BASE_PATH lo pone la publicación en GitHub Pages: «/» (la app está en la raíz de gembakit.github.io).
// En local la app vive en la raíz.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // "prompt": la versión nueva no se instala sola; la app avisa y el usuario decide.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Gemba Kit',
        short_name: 'Gemba Kit',
        description: 'Herramientas de Mejora Continua para usar en planta, sin conexión.',
        lang: 'es',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#F4EEE4',
        theme_color: '#F4EEE4',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Todo lo necesario para funcionar en modo avión. De las fuentes, solo
        // el alfabeto latino (español e inglés).
        globPatterns: ['**/*.{js,css,html,svg,png}', '**/*-latin-*.woff2'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
