import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import type { IncomingMessage } from 'node:http';

/**
 * Dev-only: serve `/.netlify/functions/<name>` by loading `netlify/functions/<name>.ts`
 * through Vite's SSR loader. Lets `npm run dev` exercise the Gemini function without
 * installing netlify-cli. In production Netlify serves the real function.
 */
function netlifyFunctionsDev(mode: string): Plugin {
  const injected = new Set<string>();
  /** Re-read .env files on every call so keys added after startup work without a restart. */
  const syncEnv = (root: string) => {
    for (const k of injected) delete process.env[k];
    for (const [k, v] of Object.entries(loadEnv(mode, root, ''))) {
      if (k in process.env) continue; // real shell env wins
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
    plugins: [react(), tailwindcss(), netlifyFunctionsDev(mode)],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  };
});
