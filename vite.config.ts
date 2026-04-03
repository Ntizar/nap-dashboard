import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Connect } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

// ── Middleware local para /api/nap/gtfs-proxy ─────────────────────────────────
// En producción este endpoint corre como Vercel Serverless Function.
// En dev lo simulamos aquí para que el HMR de Vite funcione sin Vercel CLI.
function gtfsProxyMiddleware(): Connect.HandleFunction {
  return async (
    req: IncomingMessage,
    res: ServerResponse,
    next: Connect.NextFunction
  ) => {
    if (!req.url?.startsWith('/api/nap/gtfs-proxy')) return next()

    const { URL } = await import('node:url')
    const parsed = new URL(req.url, 'http://localhost')
    const targetUrl = parsed.searchParams.get('url')

    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Parámetro url requerido' }))
      return
    }

    try {
      const apiKey =
        process.env.NAP_API_KEY ??
        (Array.isArray(req.headers['x-api-key'])
          ? req.headers['x-api-key'][0]
          : req.headers['x-api-key']) ?? ''

      const upstream = await fetch(targetUrl, {
        headers: apiKey
          ? { ApiKey: apiKey as string, Accept: 'application/zip, application/octet-stream, */*' }
          : { Accept: 'application/zip, application/octet-stream, */*' },
      })

      const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream'
      const buffer = await upstream.arrayBuffer()

      res.writeHead(upstream.status, {
        'Content-Type': contentType,
        'Content-Length': String(buffer.byteLength),
        'Access-Control-Allow-Origin': '*',
      })
      res.end(Buffer.from(buffer))
    } catch (err) {
      res.writeHead(502, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Error descargando el fichero GTFS', detail: String(err) }))
    }
  }
}

export default defineConfig(({ mode }) => {
  // Carga variables de .env.local en desarrollo
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'gtfs-proxy-middleware',
        configureServer(server) {
          server.middlewares.use(gtfsProxyMiddleware())
        },
      },
    ],
    server: {
      proxy: {
        // /api/nap/gtfs-proxy lo maneja el middleware local de arriba (bypass)
        // El resto de /api/nap/* va directamente a nap.transportes.gob.es con ApiKey
        '/api/nap': {
          target: 'https://nap.transportes.gob.es/api',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/nap/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              const headerApiKey =
                Array.isArray(req.headers['x-api-key'])
                  ? req.headers['x-api-key'][0]
                  : req.headers['x-api-key']

              const apiKey = env.NAP_API_KEY || headerApiKey || ''

              if (apiKey) {
                proxyReq.setHeader('ApiKey', apiKey)
              }
            })
          },
          bypass: (req) => {
            // Si la ruta es gtfs-proxy, no pasarla al proxy NAP — la maneja el middleware
            if (req.url?.startsWith('/api/nap/gtfs-proxy')) return req.url
            return null
          },
        },
      },
    },
  }
})
