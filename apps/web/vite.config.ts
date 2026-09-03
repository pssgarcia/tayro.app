import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA, type VitePWAOptions } from 'vite-plugin-pwa';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import path from 'path';

// Commit que está sendo publicado. Vercel/GitHub Actions injetam; local = 'dev'.
// Vira env var VITE_* (o Vite injeta em import.meta.env) pra o config/sentry.ts
// ler pelo objeto, e é a MESMA string passada ao plugin — os dois têm que
// bater pro Sentry casar o evento com o sourcemap.
const sentryRelease =
  process.env.VITE_SENTRY_RELEASE ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  'dev';
process.env.VITE_SENTRY_RELEASE = sentryRelease;

// Exportado à parte pra ser testável sem precisar montar o Vite inteiro
// (vite.config.test.ts trava a regra de nunca cachear /api/).
export const pwaOptions: Partial<VitePWAOptions> = {
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico', 'pwa-icon.svg', 'apple-touch-icon-180x180.png'],
  manifest: {
    name: 'Tayro',
    short_name: 'Tayro',
    description: 'Plataforma de creators fitness: candidaturas, conteúdo e recompensas.',
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
  // 'hidden' emite os .map mas NÃO deixa o comentário //# no JS. O plugin do
  // Sentry sobe os .map e depois os apaga do dist — nada de sourcemap servido
  // publicamente nem entrando no precache do PWA.
  build: { sourcemap: 'hidden' },
  plugins: [
    react(),
    VitePWA(pwaOptions),
    // Sobe sourcemap + cria a release no Sentry. Sem SENTRY_AUTH_TOKEN (dev,
    // CI, PR) é inerte — o build passa igual.
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      disable: !process.env.SENTRY_AUTH_TOKEN,
      telemetry: false,
      release: { name: sentryRelease },
      sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
    }),
  ],
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
