import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import {VitePWA, type ManifestOptions} from 'vite-plugin-pwa';

const pwaManifest: Partial<ManifestOptions> = {
  id: '/',
  name: 'تكس الإسكندرية — تاكسي الكورنيش',
  short_name: 'تكس إسكندرية',
  description:
    'لعبة قيادة تاكسي وموتوسيكل الإسكندرية على الكورنيش في جولة ثلاثية الأبعاد.',
  theme_color: '#0B121C',
  background_color: '#090D16',
  display: 'standalone',
  orientation: 'any',
  start_url: '/',
  scope: '/',
  lang: 'ar',
  dir: 'rtl',
  icons: [
    {
      src: '/pwa-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/pwa-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/pwa-maskable-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
};

function devPwaSafePlugin(): Plugin {
  return {
    name: 'dev-pwa-safe',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/manifest.webmanifest', (_req, res) => {
        res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
        res.end(JSON.stringify(pwaManifest));
      });
      // Neutralize any previously cached dev HTML that still references vite-plugin-pwa's HMR SW loader
      server.middlewares.use('/@vite-plugin-pwa/pwa-entry-point-loaded', (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.end('export default function registerDevSW() {}\n');
      });
      // Self-unregister any stale dev-sw.js left over in the browser from earlier runs
      server.middlewares.use('/dev-sw.js', (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(
          `self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => clients.forEach((c) => c.navigate(c.url)))
  );
});\n`,
        );
      });
    },
    transform(code, id) {
      if (id.includes('vite/dist/client/client.mjs') && code.includes('ws.send(JSON.stringify(data))')) {
        return {
          code: code.replace(
            'ws.send(JSON.stringify(data))',
            'if (ws && ws.readyState === 1) ws.send(JSON.stringify(data))',
          ),
          map: null,
        };
      }
      return null;
    },
    transformIndexHtml(html) {
      if (html.includes('rel="manifest"')) return html;
      return html.replace('</head>', '  <link rel="manifest" href="/manifest.webmanifest" />\n  </head>');
    },
  };
}

export default defineConfig(() => {
  const hmrDisabled = process.env.DISABLE_HMR === 'true';

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'icon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: pwaManifest,
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/@/, /^\/__/, /^\/api\//],
          runtimeCaching: [
            {
              urlPattern: ({url, request}) =>
                !url.pathname.startsWith('/@') &&
                !url.pathname.startsWith('/__') &&
                (request.destination === 'document' ||
                  request.destination === 'script' ||
                  request.destination === 'style' ||
                  request.destination === 'image' ||
                  request.destination === 'font'),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'alex-taxi-offline-runtime',
                expiration: {
                  maxEntries: 120,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          // Keep disabled in dev server so vite-plugin-pwa never calls import.meta.hot.send() on Vite 8 without WS;
          // full offline Service Worker (sw.js) & manifest are generated in production builds.
          enabled: false,
        },
      }),
      devPwaSafePlugin(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: !hmrDisabled,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: hmrDisabled ? null : {},
    },
  };
});
