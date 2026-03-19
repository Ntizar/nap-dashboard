/**
 * Parser de ficheros GTFS (General Transit Feed Specification).
 *
 * GTFS es un ZIP con múltiples archivos CSV. Este módulo:
 *   1. Descomprime el ZIP usando fflate (funciona en el browser sin Node.js)
 *   2. Parsea los CSV relevantes: stops, routes, trips, stop_times, shapes, agency
 *   3. Devuelve estructuras tipadas listas para renderizar
 *
 * Archivos GTFS que parseamos:
 *   - stops.txt       → paradas (lat/lon + nombre)
 *   - routes.txt      → líneas (nombre + color)
 *   - trips.txt       → viajes (relación ruta ↔ shape)
 *   - stop_times.txt  → horarios por parada
 *   - shapes.txt      → geometría de trazados (opcional)
 *   - agency.txt      → operador
 */

import { unzipSync } from 'fflate'

// ── Tipos GTFS ────────────────────────────────────────────────────────────────

export interface GtfsStop {
  stop_id: string
  stop_name: string
  stop_lat: number
  stop_lon: number
  stop_code?: string
  stop_desc?: string
}

export interface GtfsRoute {
  route_id: string
  route_short_name: string
  route_long_name: string
  route_type: number          // 0=tram, 1=metro, 2=rail, 3=bus, ...
  route_color?: string        // hex sin #
  route_text_color?: string
  agency_id?: string
}

export interface GtfsTrip {
  trip_id: string
  route_id: string
  shape_id?: string
  trip_headsign?: string
  direction_id?: string
}

export interface GtfsStopTime {
  trip_id: string
  stop_id: string
  arrival_time: string
  departure_time: string
  stop_sequence: number
}

export interface GtfsShape {
  shape_id: string
  shape_pt_lat: number
  shape_pt_lon: number
  shape_pt_sequence: number
}

export interface GtfsAgency {
  agency_id?: string
  agency_name: string
  agency_url?: string
  agency_timezone?: string
}

export interface GtfsData {
  stops: GtfsStop[]
  routes: GtfsRoute[]
  trips: GtfsTrip[]
  stopTimes: GtfsStopTime[]
  shapes: GtfsShape[]
  agencies: GtfsAgency[]
  // Estructuras derivadas para facilitar el rendering
  shapesByShapeId: Map<string, GtfsShape[]>
  routeByTripId: Map<string, GtfsRoute>
  stopById: Map<string, GtfsStop>
  tripsByRouteId: Map<string, GtfsTrip[]>
  stopTimesByTripId: Map<string, GtfsStopTime[]>
}

// ── CSV parser minimalista ────────────────────────────────────────────────────

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r/g, '').split('\n').filter(Boolean)
  if (lines.length < 2) return []

  // Eliminar BOM si existe
  const headerLine = lines[0].startsWith('\ufeff')
    ? lines[0].slice(1)
    : lines[0]

  const headers = headerLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''))

  return lines.slice(1).map((line) => {
    // Parser básico — respeta comas dentro de comillas
    const values: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    values.push(current.trim())

    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = values[i] ?? ''
    })
    return row
  })
}

function decode(bytes: Uint8Array): string {
  return new TextDecoder('utf-8').decode(bytes)
}

// ── Parser principal ──────────────────────────────────────────────────────────

export function parseGtfsZip(buffer: ArrayBuffer): GtfsData {
  const files = unzipSync(new Uint8Array(buffer))

  const getFile = (name: string): Record<string, string>[] => {
    // Buscar case-insensitive y en subdirectorios
    const key = Object.keys(files).find(
      (k) => k.toLowerCase().endsWith(name.toLowerCase())
    )
    if (!key) return []
    return parseCsv(decode(files[key]))
  }

  // ── Parsear archivos ─────────────────────────────────────────────────────

  const stops: GtfsStop[] = getFile('stops.txt').map((r) => ({
    stop_id: r.stop_id ?? '',
    stop_name: r.stop_name ?? '',
    stop_lat: parseFloat(r.stop_lat ?? '0'),
    stop_lon: parseFloat(r.stop_lon ?? '0'),
    stop_code: r.stop_code,
    stop_desc: r.stop_desc,
  })).filter((s) => !isNaN(s.stop_lat) && !isNaN(s.stop_lon) && s.stop_lat !== 0)

  const routes: GtfsRoute[] = getFile('routes.txt').map((r) => ({
    route_id: r.route_id ?? '',
    route_short_name: r.route_short_name ?? '',
    route_long_name: r.route_long_name ?? '',
    route_type: parseInt(r.route_type ?? '3', 10),
    route_color: r.route_color || undefined,
    route_text_color: r.route_text_color || undefined,
    agency_id: r.agency_id,
  }))

  const trips: GtfsTrip[] = getFile('trips.txt').map((r) => ({
    trip_id: r.trip_id ?? '',
    route_id: r.route_id ?? '',
    shape_id: r.shape_id || undefined,
    trip_headsign: r.trip_headsign || undefined,
    direction_id: r.direction_id || undefined,
  }))

  // stop_times puede ser muy grande — limitamos a 50k filas para el browser
  const rawStopTimes = getFile('stop_times.txt').slice(0, 50000)
  const stopTimes: GtfsStopTime[] = rawStopTimes.map((r) => ({
    trip_id: r.trip_id ?? '',
    stop_id: r.stop_id ?? '',
    arrival_time: r.arrival_time ?? '',
    departure_time: r.departure_time ?? '',
    stop_sequence: parseInt(r.stop_sequence ?? '0', 10),
  }))

  const shapes: GtfsShape[] = getFile('shapes.txt').map((r) => ({
    shape_id: r.shape_id ?? '',
    shape_pt_lat: parseFloat(r.shape_pt_lat ?? '0'),
    shape_pt_lon: parseFloat(r.shape_pt_lon ?? '0'),
    shape_pt_sequence: parseInt(r.shape_pt_sequence ?? '0', 10),
  })).filter((s) => !isNaN(s.shape_pt_lat))

  const agencies: GtfsAgency[] = getFile('agency.txt').map((r) => ({
    agency_id: r.agency_id,
    agency_name: r.agency_name ?? '',
    agency_url: r.agency_url,
    agency_timezone: r.agency_timezone,
  }))

  // ── Índices derivados ────────────────────────────────────────────────────

  const shapesByShapeId = new Map<string, GtfsShape[]>()
  for (const s of shapes) {
    const arr = shapesByShapeId.get(s.shape_id) ?? []
    arr.push(s)
    shapesByShapeId.set(s.shape_id, arr)
  }
  // Ordenar por secuencia
  for (const [id, pts] of shapesByShapeId) {
    shapesByShapeId.set(id, pts.sort((a, b) => a.shape_pt_sequence - b.shape_pt_sequence))
  }

  const routeById = new Map(routes.map((r) => [r.route_id, r]))

  const routeByTripId = new Map<string, GtfsRoute>()
  const tripsByRouteId = new Map<string, GtfsTrip[]>()
  for (const t of trips) {
    const route = routeById.get(t.route_id)
    if (route) routeByTripId.set(t.trip_id, route)
    const arr = tripsByRouteId.get(t.route_id) ?? []
    arr.push(t)
    tripsByRouteId.set(t.route_id, arr)
  }

  const stopById = new Map(stops.map((s) => [s.stop_id, s]))

  const stopTimesByTripId = new Map<string, GtfsStopTime[]>()
  for (const st of stopTimes) {
    const arr = stopTimesByTripId.get(st.trip_id) ?? []
    arr.push(st)
    stopTimesByTripId.set(st.trip_id, arr)
  }

  return {
    stops,
    routes,
    trips,
    stopTimes,
    shapes,
    agencies,
    shapesByShapeId,
    routeByTripId,
    stopById,
    tripsByRouteId,
    stopTimesByTripId,
  }
}

// ── Helpers de colores GTFS ───────────────────────────────────────────────────

const ROUTE_TYPE_COLORS: Record<number, string> = {
  0: '#e63946', // tram
  1: '#2563eb', // metro
  2: '#7c3aed', // rail
  3: '#16a34a', // bus
  4: '#0891b2', // ferry
  5: '#d97706', // cable car
  6: '#db2777', // gondola
  7: '#65a30d', // funicular
  11: '#0d9488', // trolleybus
  12: '#1e40af', // monorail
}

export function routeColor(route: GtfsRoute): string {
  if (route.route_color) return `#${route.route_color}`
  return ROUTE_TYPE_COLORS[route.route_type] ?? '#6b7280'
}

export function routeTypeName(type: number): string {
  const names: Record<number, string> = {
    0: 'Tranvía',
    1: 'Metro',
    2: 'Ferrocarril',
    3: 'Bus',
    4: 'Ferry',
    5: 'Teleférico',
    6: 'Góndola',
    7: 'Funicular',
    11: 'Trolebús',
    12: 'Monorraíl',
  }
  return names[type] ?? `Tipo ${type}`
}
