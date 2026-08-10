import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA, type VitePWAOptions } from 'vite-plugin-pwa';
import path from 'path';

// Exportado à parte pra ser testável sem precisar montar o Vite inteiro
// (vite.config.test.ts trava a regra de nunca cachear /api/).
export const pwaOptions: Partial<VitePWAOptions> = {
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico', 'pwa-icon.svg', 'apple-touch-icon-180x180.png'],
  manifest: {
    name: 'Tayro',
    short_name: 'Tayro',
    description: 'CRM de creators fitness — candidaturas, conteúdo e recompensas.',
    lang: 'pt-BR',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0A0A',
    theme_color: '#0A0A0A',
    icons: [
      { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      {
        src: 'maskable-icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  },
  workbox: {
    // /api/* é rewrite same-origin pro Railway em produção (vercel.json) — cobre
    // login/refresh E qualquer dado autenticado ou público. Nunca servir do cache.
    navigateFallbackDenylist: [/^\/api\//],
    runtimeCaching: [
      {
        urlPattern: /^\/api\//,
        handler: 'NetworkOnly',
      },
    ],
  },
};

export default defineConfig({
  plugins: [react(), VitePWA(pwaOptions)],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // Quando o backend não está rodando, envia 502 de volta ao browser
        // para que o axios possa rejeitar a promessa e o app não fique travado.
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if ('writeHead' in res) {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ message: 'API unavailable' }));
            }
          });
        },
      },
    },
  },
});
