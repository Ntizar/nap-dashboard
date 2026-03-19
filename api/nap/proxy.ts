import type { VercelRequest, VercelResponse } from '@vercel/node'

const NAP_BASE = 'https://nap.transportes.gob.es/api'

/**
 * Proxy catch-all para la API de NAP Transportes.
 * La API key se lee del entorno de Vercel — nunca del cliente.
 * 
 * Mapeo de rutas:
 *   /api/nap/Fichero/GetList  →  https://nap.transportes.gob.es/api/Fichero/GetList
 *   /api/nap/Region           →  https://nap.transportes.gob.es/api/Region
 *   etc.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.NAP_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'NAP_API_KEY no configurada en el servidor' })
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
