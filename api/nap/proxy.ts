import type { VercelRequest, VercelResponse } from '@vercel/node'

const NAP_BASE = 'https://nap.transportes.gob.es/api'

/**
 * Proxy catch-all para la API de NAP Transportes.
 *
 * Resolución de la ApiKey (por orden de prioridad):
 *   1. Variable de entorno NAP_API_KEY en Vercel (deploy en producción)
 *   2. Header X-Api-Key enviado por el cliente (key guardada en localStorage del usuario)
 *
 * Esto permite que el proyecto funcione sin configuración de Vercel:
 * el usuario introduce su key en el modal y se usa automáticamente.
 *
 * Mapeo de rutas:
 *   /api/nap/Fichero/GetList  →  https://nap.transportes.gob.es/api/Fichero/GetList
 *   /api/nap/Region           →  https://nap.transportes.gob.es/api/Region
 *   etc.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Prioridad 1: variable de entorno del servidor (más segura)
  // Prioridad 2: header enviado por el cliente (key del usuario en localStorage)
  const apiKey =
    process.env.NAP_API_KEY ??
    (Array.isArray(req.headers['x-api-key'])
      ? req.headers['x-api-key'][0]
      : req.headers['x-api-key'])

  if (!apiKey) {
    return res.status(401).json({
      error: 'API key no configurada',
      hint: 'Configura NAP_API_KEY en Vercel o introduce tu key en el dashboard',
    })
  }

  // Extraer la ruta después de /api/nap/
  const url = new URL(req.url ?? '/', `https://${req.headers.host}`)
  const napPath = url.pathname.replace(/^\/api\/nap\/?/, '')
  const targetUrl = `${NAP_BASE}/${napPath}${url.search}`

  const headers: HeadersInit = {
    ApiKey: apiKey,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method ?? 'GET',
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD'
        ? JSON.stringify(req.body)
        : undefined,
    })

    const contentType = upstream.headers.get('content-type') ?? ''

    // Para descargas binarias (ZIP de GTFS), devolver el buffer crudo
    if (contentType.includes('application/zip') || contentType.includes('application/octet-stream')) {
      const buffer = await upstream.arrayBuffer()
      res.setHeader('Content-Type', contentType)
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200')
      return res.status(upstream.status).send(Buffer.from(buffer))
    }

    const data = contentType.includes('application/json')
      ? await upstream.json()
      : await upstream.text()

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    return res.status(upstream.status).json(data)
  } catch (err) {
    return res.status(502).json({ error: 'Error conectando con la API de NAP', detail: String(err) })
  }
}
