import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
import type { IncomingMessage } from 'node:http';

/**
 * Dev-only: serve `/.netlify/functions/<name>` by loading `netlify/functions/<name>.ts`
 * through Vite's SSR loader. Lets `npm run dev` exercise the Gemini function without
 * installing netlify-cli. In production Netlify serves the real function.
 */
function netlifyFunctionsDev(mode: string): Plugin {
  // Snapshot the real shell env once per process (the config re-runs on every server restart).
  const g = globalThis as { __zidShellEnv?: Record<string, string | undefined> };
  const shellEnv = (g.__zidShellEnv ??= { ...process.env });
  /** Re-read .env files on every call so edits apply without restarting the dev server. */
  const injected = new Set<string>();
  const syncEnv = (root: string) => {
    // loadEnv lets process.env override files, so drop our own earlier injections first.
    for (const k of injected) delete process.env[k];
    injected.clear();
    for (const [k, v] of Object.entries(loadEnv(mode, root, ''))) {
      if (shellEnv[k]) continue; // a real shell env var wins
      process.env[k] = v;
      injected.add(k);
    }
  };

  return {
    name: 'zid:netlify-functions-dev',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/.netlify/functions', async (req, res) => {
        const name = (req.url ?? '/').split('?')[0].replace(/^\/+/, '');
        if (!/^[a-z0-9-]+$/i.test(name)) {
          res.statusCode = 404;
          return res.end('Not found');
        }
        try {
          syncEnv(server.config.root);
          const mod = await server.ssrLoadModule(`/netlify/functions/${name}.ts`);
          const body = await readBody(req);
          const request = new Request(`http://localhost${req.originalUrl ?? req.url}`, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
          });
          const response: Response = await mod.default(request, {});
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (err) {
          server.config.logger.error(`[functions] ${name}: ${(err as Error).stack ?? err}`);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Function crashed (see dev server logs)' }));
        }
      });
    },
  };
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default defineConfig(({ mode }) => {
  return {
    plugins: [react(), tailwindcss(), netlifyFunctionsDev(mode), pwa()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? 'dev') },
    build: {
      // Firebase alone is ~790 kB minified (~200 kB gzip); it is split into its own cached chunk.
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          // Split big vendors so app updates don't re-download Firebase/Recharts.
          manualChunks: {
            react: ['react', 'react-dom', 'react-router'],
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            charts: ['recharts'],
            i18n: ['i18next', 'react-i18next'],
          },
        },
      },
    },
  };
});

/**
 * PWA: installable app + offline shell.
 * - Precache: the built app (JS/CSS/HTML/icons) so the UI opens with no network.
 * - Runtime cache: exercise illustrations (4 MB, cached as they're viewed) and Google Fonts.
 * - Data works offline through Firestore's own IndexedDB cache; AI + barcode lookups need network.
 */
function pwa() {
  return VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icon.svg', 'apple-touch-icon.png'],
    manifest: {
      id: '/',
      name: 'Zid — كول بالعقل، كبّر بالجد',
      short_name: 'Zid',
      description: 'Eat smart, grow hard. Log meals by photo, track workouts and progress.',
      lang: 'en',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#0f1512',
      theme_color: '#0f1512',
      categories: ['health', 'fitness', 'food'],
      icons: [
        { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
      shortcuts: [
        { name: 'Add meal', short_name: 'Meal', url: '/meal/new', icons: [{ src: '/pwa-192.png', sizes: '192x192' }] },
        { name: 'Start workout', short_name: 'Workout', url: '/train/session', icons: [{ src: '/pwa-192.png', sizes: '192x192' }] },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
      globIgnores: ['exercises/**'],
      navigateFallback: '/index.html',
      navigateFallbackDenylist: [/^\/\.netlify\//],
      cleanupOutdatedCaches: true,
      importScripts: ['/sw-notify.js'],
      runtimeCaching: [
        {
          urlPattern: ({ url }) => url.pathname.startsWith('/exercises/'),
          handler: 'CacheFirst',
          options: { cacheName: 'exercise-images', expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 365 } },
        },
        {
          urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'google-fonts-css' },
        },
        {
          urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
          handler: 'CacheFirst',
          options: { cacheName: 'google-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
        },
      ],
    },
    devOptions: { enabled: false },
  });
}
