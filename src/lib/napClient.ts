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

export const getDownloadLink = (ficheroId: number) =>
  napFetch<string>(`Fichero/downloadLink/${ficheroId}`)

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
 * Descarga el ZIP de un fichero GTFS.
 * Devuelve el ArrayBuffer crudo para parsear con fflate en el cliente.
 */
export async function downloadGtfsZip(ficheroId: number): Promise<ArrayBuffer> {
  // Primero obtenemos la URL de descarga
  const downloadUrl = await getDownloadLink(ficheroId)

  // La URL puede ser directa o relativa al proxy
  const url = downloadUrl.startsWith('http')
    ? `/api/nap/gtfs-proxy?url=${encodeURIComponent(downloadUrl)}`
    : `${BASE}/${downloadUrl}`

  const res = await fetch(url, {
    headers: { 'X-Api-Key': getApiKey() },
  })
  if (!res.ok) throw new Error(`GTFS download ${res.status}`)
  return res.arrayBuffer()
}
