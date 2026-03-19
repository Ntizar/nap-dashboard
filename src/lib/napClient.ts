/**
 * Cliente HTTP para la API de NAP Transportes.
 *
 * Todas las llamadas van a /api/nap/* — nunca directamente a NAP desde el browser.
 * La ApiKey se añade en el servidor:
 *   - Producción (Vercel): edge function en api/nap/proxy.ts lee NAP_API_KEY del entorno
 *   - Desarrollo local: proxy de Vite en vite.config.ts lee NAP_API_KEY de .env.local
 *   - Sin variable de entorno: el cliente envía la key vía header X-Api-Key (leída de localStorage)
 *
 * La key nunca está en el bundle del cliente como literal — viene de localStorage en runtime.
 */

import type {
  GetListResponse,
  TipoTransporte,
  TipoFichero,
  Region,
  Organizacion,
  Operador,
  FilterBody,
} from './types'

const BASE = '/api/nap'

// La key se inyecta en runtime desde localStorage — nunca como string literal en código
function getApiKey(): string {
  return localStorage.getItem('nap_api_key') ?? ''
}

async function napFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': getApiKey(),
      ...options?.headers,
    },
  })
  if (!res.ok) throw new Error(`NAP API ${res.status} — /${path}`)
  return res.json() as Promise<T>
}

// ── Ficheros / Datasets ──────────────────────────────────────────────────────

export const getDatasets = () =>
  napFetch<GetListResponse>('Fichero/GetList')

export const filterDatasets = (body: FilterBody) =>
  napFetch<GetListResponse>('Fichero/Filter', {
    method: 'POST',
    body: JSON.stringify(body),
  })

/**
 * Devuelve la URL de descarga de un fichero.
 * El NAP responde con texto plano (no JSON), así que leemos .text() directamente.
 */
export async function getDownloadLink(ficheroId: number): Promise<string> {
  const res = await fetch(`${BASE}/Fichero/downloadLink/${ficheroId}`, {
    headers: { 'X-Api-Key': getApiKey() },
  })
  if (!res.ok) throw new Error(`NAP API ${res.status} — downloadLink/${ficheroId}`)
  const text = await res.text()
  // El proxy puede devolver JSON string o texto plano — normalizamos ambos
  if (text.startsWith('"') && text.endsWith('"')) {
    return JSON.parse(text) as string
  }
  return text.trim()
}

// ── Catálogos ────────────────────────────────────────────────────────────────

export const getTransportTypes = () =>
  napFetch<TipoTransporte[]>('TipoTransporte')

export const getFileTypes = () =>
  napFetch<TipoFichero[]>('TipoFichero')

export const getRegions = () =>
  napFetch<Region[]>('Region')

export const getOrganizations = () =>
  napFetch<Organizacion[]>('Organizacion')

export const getOperators = () =>
  napFetch<Operador[]>('Operador')

// ── GTFS ─────────────────────────────────────────────────────────────────────

/**
 * Descarga el ZIP de un fichero GTFS dado su ID.
 *
 * Flujo:
 *   1. Pide la URL de descarga a NAP (respuesta texto plano)
 *   2. Si la URL es externa, la descarga via /api/nap/gtfs-proxy para evitar CORS
 *   3. Si es relativa, la pide directamente al proxy NAP
 *
 * Devuelve el ArrayBuffer crudo para parsear con fflate en el cliente.
 */
export async function downloadGtfsZip(ficheroId: number): Promise<ArrayBuffer> {
  const downloadUrl = await getDownloadLink(ficheroId)
  return fetchGtfsZipByUrl(downloadUrl)
}

/**
 * Descarga un ZIP GTFS desde una URL concreta (externa o relativa).
 * Usar cuando ya se tiene la URL (p.ej. desde el viewer que guarda la selección).
 */
export async function fetchGtfsZipByUrl(downloadUrl: string): Promise<ArrayBuffer> {
  let fetchUrl: string
  const headers: Record<string, string> = { 'X-Api-Key': getApiKey() }

  if (downloadUrl.startsWith('http')) {
    // URL externa → pasar por el proxy server-side para evitar CORS
    fetchUrl = `${BASE}/gtfs-proxy?url=${encodeURIComponent(downloadUrl)}`
  } else {
    // Ruta relativa → añadir base del proxy NAP
    fetchUrl = `${BASE}/${downloadUrl.replace(/^\//, '')}`
  }

  const res = await fetch(fetchUrl, { headers })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Error descargando GTFS (${res.status})${body ? ': ' + body : ''}`)
  }
  return res.arrayBuffer()
}
