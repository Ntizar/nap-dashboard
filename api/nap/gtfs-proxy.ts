import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Proxy para descargar ZIPs GTFS desde URLs externas.
 *
 * El endpoint downloadLink del NAP devuelve una URL externa (p.ej. mf.transportes.gob.es).
 * Esa URL puede tener CORS bloqueado para peticiones browser-directo.
 * Este proxy la descarga server-side y la reenvía al cliente.
 *
 * Uso: GET /api/nap/gtfs-proxy?url=<encoded-url>
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url } = req.query

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Parámetro url requerido' })
  }

  // Validar que la URL sea de dominios de transporte español conocidos
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return res.status(400).json({ error: 'URL inválida' })
  }

  // Dominios permitidos: servidores oficiales del NAP + buckets S3 del Ministerio de Transportes.
  // APRENDIZAJE: el endpoint downloadLink del NAP puede devolver URLs de buckets S3 de AWS
  // (mfomwpronapdata.s3.eu-west-1.amazonaws.com, etc.) — hay que incluirlos en la whitelist.
  // El patrón seguro es validar el sufijo '.s3.eu-west-1.amazonaws.com' solo para buckets
  // conocidos del Ministerio (mfomw* / mitma* / nap*), no abrir todos los S3 de AWS.
  const allowedHosts = [
    'nap.transportes.gob.es',
    'mf.transportes.gob.es',
    'administracion.transportes.gob.es',
    'datos.gob.es',
    'opendata.renfe.com',
    'www.mitma.es',
    'mitma.es',
    // Buckets S3 del Ministerio de Transportes (Fomento/Movilidad)
    'mfomwpronapdata.s3.eu-west-1.amazonaws.com',
    'mitmapronapdata.s3.eu-west-1.amazonaws.com',
    'napdata.s3.eu-west-1.amazonaws.com',
    'napdata.s3.amazonaws.com',
  ]
  const isAllowed =
    allowedHosts.some((h) => parsedUrl.hostname === h || parsedUrl.hostname.endsWith(`.${h}`)) ||
    // Patrón genérico para cualquier bucket S3 cuyo nombre empiece por 'mfomw', 'mitma' o 'nap'
    /^(mfomw|mitma|nap)[a-z0-9-]*\.s3\.[a-z0-9-]+\.amazonaws\.com$/.test(parsedUrl.hostname)
  if (!isAllowed) {
    return res.status(403).json({
      error: 'Dominio no permitido',
      host: parsedUrl.hostname,
      hint: 'Solo se permiten descargas desde dominios de transporte oficial español',
    })
  }

  const apiKey =
    process.env.NAP_API_KEY ??
    (Array.isArray(req.headers['x-api-key'])
      ? req.headers['x-api-key'][0]
      : req.headers['x-api-key'])

  try {
    const upstream = await fetch(url, {
      headers: apiKey
        ? { ApiKey: apiKey, Accept: 'application/zip, application/octet-stream, */*' }
        : { Accept: 'application/zip, application/octet-stream, */*' },
    })

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: `Error descargando GTFS desde servidor externo: ${upstream.status}`,
        url,
      })
    }

    const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream'
    const buffer = await upstream.arrayBuffer()

    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Length', buffer.byteLength)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200')
    return res.status(200).send(Buffer.from(buffer))
  } catch (err) {
    return res.status(502).json({
      error: 'Error descargando el fichero GTFS',
      detail: String(err),
    })
  }
}
