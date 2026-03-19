/**
 * Cliente HTTP para la API de NAP Transportes.
 * En producción (Vercel) todas las llamadas van al proxy /api/nap/*
 * que añade la ApiKey en el servidor. La key nunca llega al navegador.
 *
 * En desarrollo local: arranca `vercel dev` para que el proxy funcione.
 */

const BASE = '/api/nap'

async function napFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE}/${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    throw new Error(`NAP API error ${res.status} en /${path}`)
  }

  return res.json() as Promise<T>
}

// ── Ficheros / Datasets ──────────────────────────────────────────────────────

export const getDatasets = () =>
  napFetch<unknown[]>('Fichero/GetList')

export const getDatasetsByRegion = (regionId: number) =>
  napFetch<unknown[]>(`Fichero/GetListByRegion/${regionId}`)

export const getDatasetsByType = (tipoTransporteId: number) =>
  napFetch<unknown[]>(`Fichero/GetListByType/${tipoTransporteId}`)

export const filterDatasets = (body: object) =>
  napFetch<unknown[]>('Fichero/Filter', {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const getDownloadLink = (ficheroId: number) =>
  napFetch<{ url: string }>(`Fichero/downloadLink/${ficheroId}`)

// ── Catálogos (se cachean 5 min) ─────────────────────────────────────────────

export const getTransportTypes = () =>
  napFetch<unknown[]>('TipoTransporte')

export const getFileTypes = () =>
  napFetch<unknown[]>('TipoFichero')

export const getRegions = () =>
  napFetch<unknown[]>('Region')

export const getOrganizations = () =>
  napFetch<unknown[]>('Organizacion')

export const getOperators = () =>
  napFetch<unknown[]>('Operador')
