/**
 * Parser de ficheros GTFS (General Transit Feed Specification).
 * Referencia completa: https://gtfs.org/schedule/reference/
 *
 * Archivos soportados:
 *   Requeridos: stops.txt, routes.txt, trips.txt, stop_times.txt
 *   Opcionales: agency.txt, calendar.txt, calendar_dates.txt,
 *               shapes.txt, frequencies.txt, transfers.txt,
 *               feed_info.txt, fare_attributes.txt, fare_rules.txt,
 *               pathways.txt, levels.txt, attributions.txt
 */

import { unzipSync } from 'fflate'

// ── Tipos GTFS ────────────────────────────────────────────────────────────────

export interface GtfsAgency {
  agency_id?: string
  agency_name: string
  agency_url?: string
  agency_timezone?: string
  agency_lang?: string
  agency_phone?: string
  agency_fare_url?: string
  agency_email?: string
}

export interface GtfsStop {
  stop_id: string
  stop_name: string
  stop_lat: number
  stop_lon: number
  stop_code?: string
  stop_desc?: string
  zone_id?: string
  stop_url?: string
  location_type?: number   // 0=stop, 1=station, 2=entrance, 3=generic, 4=boarding area
  parent_station?: string
  stop_timezone?: string
  wheelchair_boarding?: number
  level_id?: string
  platform_code?: string
}

export interface GtfsRoute {
  route_id: string
  route_short_name: string
  route_long_name: string
  route_type: number
  agency_id?: string
  route_desc?: string
  route_url?: string
  route_color?: string
  route_text_color?: string
  route_sort_order?: number
  continuous_pickup?: number
  continuous_drop_off?: number
}

export interface GtfsTrip {
  trip_id: string
  route_id: string
  service_id: string
  shape_id?: string
  trip_headsign?: string
  trip_short_name?: string
  direction_id?: string   // '0' | '1'
  block_id?: string
  wheelchair_accessible?: number
  bikes_allowed?: number
}

export interface GtfsStopTime {
  trip_id: string
  stop_id: string
  arrival_time: string
  departure_time: string
  stop_sequence: number
  stop_headsign?: string
  pickup_type?: number
  drop_off_type?: number
  shape_dist_traveled?: number
  timepoint?: number
}

export interface GtfsShape {
  shape_id: string
  shape_pt_lat: number
  shape_pt_lon: number
  shape_pt_sequence: number
  shape_dist_traveled?: number
}

export interface GtfsCalendar {
  service_id: string
  monday: boolean
  tuesday: boolean
  wednesday: boolean
  thursday: boolean
  friday: boolean
  saturday: boolean
  sunday: boolean
  start_date: string
  end_date: string
}

export interface GtfsCalendarDate {
  service_id: string
  date: string
  exception_type: number   // 1=added, 2=removed
}

export interface GtfsFrequency {
  trip_id: string
  start_time: string
  end_time: string
  headway_secs: number
  exact_times?: number   // 0=frequency-based, 1=schedule-based
}

export interface GtfsTransfer {
  from_stop_id: string
  to_stop_id: string
  transfer_type: number   // 0=recommended, 1=timed, 2=min_transfer_time, 3=no transfer
  min_transfer_time?: number
  from_route_id?: string
  to_route_id?: string
  from_trip_id?: string
  to_trip_id?: string
}

export interface GtfsFeedInfo {
  feed_publisher_name: string
  feed_publisher_url: string
  feed_lang: string
  default_lang?: string
  feed_start_date?: string
  feed_end_date?: string
  feed_version?: string
  feed_contact_email?: string
  feed_contact_url?: string
}

export interface GtfsFareAttribute {
  fare_id: string
  price: number
  currency_type: string
  payment_method: number
  transfers: number
  agency_id?: string
  transfer_duration?: number
}

export interface GtfsData {
  // Core
  agencies: GtfsAgency[]
  stops: GtfsStop[]
  routes: GtfsRoute[]
  trips: GtfsTrip[]
  stopTimes: GtfsStopTime[]
  // Optional
  shapes: GtfsShape[]
  calendar: GtfsCalendar[]
  calendarDates: GtfsCalendarDate[]
  frequencies: GtfsFrequency[]
  transfers: GtfsTransfer[]
  feedInfo: GtfsFeedInfo | null
  fareAttributes: GtfsFareAttribute[]
  // Available files list (for UI to know what data is present)
  availableFiles: string[]
  // Derived indexes
  shapesByShapeId: Map<string, GtfsShape[]>
  routeByTripId: Map<string, GtfsRoute>
  stopById: Map<string, GtfsStop>
  tripsByRouteId: Map<string, GtfsTrip[]>
  stopTimesByTripId: Map<string, GtfsStopTime[]>
  calendarByServiceId: Map<string, GtfsCalendar>
  calendarDatesByServiceId: Map<string, GtfsCalendarDate[]>
  frequenciesByTripId: Map<string, GtfsFrequency[]>
}

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r/g, '').split('\n').filter(Boolean)
  if (lines.length < 2) return []

  const headerLine = lines[0].startsWith('\ufeff') ? lines[0].slice(1) : lines[0]
  const headers = headerLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''))

  return lines.slice(1).map((line) => {
    const values: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    values.push(current.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? '' })
    return row
  })
}

function decode(bytes: Uint8Array): string {
  return new TextDecoder('utf-8').decode(bytes)
}

function b(val: string): boolean {
  return val === '1'
}

// ── Parser principal ──────────────────────────────────────────────────────────

export function parseGtfsZip(buffer: ArrayBuffer): GtfsData {
  const files = unzipSync(new Uint8Array(buffer))

  const availableFiles: string[] = Object.keys(files).map((k) => k.split('/').pop() ?? k)

  const getFile = (name: string): Record<string, string>[] => {
    const key = Object.keys(files).find(
      (k) => k.toLowerCase().endsWith(name.toLowerCase())
    )
    if (!key) return []
    return parseCsv(decode(files[key]))
  }

  // ── Core ──────────────────────────────────────────────────────────────────

  const agencies: GtfsAgency[] = getFile('agency.txt').map((r) => ({
    agency_id: r.agency_id || undefined,
    agency_name: r.agency_name ?? '',
    agency_url: r.agency_url || undefined,
    agency_timezone: r.agency_timezone || undefined,
    agency_lang: r.agency_lang || undefined,
    agency_phone: r.agency_phone || undefined,
    agency_fare_url: r.agency_fare_url || undefined,
    agency_email: r.agency_email || undefined,
  }))

  const stops: GtfsStop[] = getFile('stops.txt').map((r) => ({
    stop_id: r.stop_id ?? '',
    stop_name: r.stop_name ?? '',
    stop_lat: parseFloat(r.stop_lat ?? '0'),
    stop_lon: parseFloat(r.stop_lon ?? '0'),
    stop_code: r.stop_code || undefined,
    stop_desc: r.stop_desc || undefined,
    zone_id: r.zone_id || undefined,
    stop_url: r.stop_url || undefined,
    location_type: r.location_type ? parseInt(r.location_type, 10) : undefined,
    parent_station: r.parent_station || undefined,
    stop_timezone: r.stop_timezone || undefined,
    wheelchair_boarding: r.wheelchair_boarding ? parseInt(r.wheelchair_boarding, 10) : undefined,
    level_id: r.level_id || undefined,
    platform_code: r.platform_code || undefined,
  })).filter((s) => !isNaN(s.stop_lat) && !isNaN(s.stop_lon) && (s.stop_lat !== 0 || s.stop_lon !== 0))

  const routes: GtfsRoute[] = getFile('routes.txt').map((r) => ({
    route_id: r.route_id ?? '',
    route_short_name: r.route_short_name ?? '',
    route_long_name: r.route_long_name ?? '',
    route_type: parseInt(r.route_type ?? '3', 10),
    agency_id: r.agency_id || undefined,
    route_desc: r.route_desc || undefined,
    route_url: r.route_url || undefined,
    route_color: r.route_color || undefined,
    route_text_color: r.route_text_color || undefined,
    route_sort_order: r.route_sort_order ? parseInt(r.route_sort_order, 10) : undefined,
  }))

  const trips: GtfsTrip[] = getFile('trips.txt').map((r) => ({
    trip_id: r.trip_id ?? '',
    route_id: r.route_id ?? '',
    service_id: r.service_id ?? '',
    shape_id: r.shape_id || undefined,
    trip_headsign: r.trip_headsign || undefined,
    trip_short_name: r.trip_short_name || undefined,
    direction_id: r.direction_id || undefined,
    block_id: r.block_id || undefined,
    wheelchair_accessible: r.wheelchair_accessible ? parseInt(r.wheelchair_accessible, 10) : undefined,
    bikes_allowed: r.bikes_allowed ? parseInt(r.bikes_allowed, 10) : undefined,
  }))

  // stop_times puede ser enorme — limitamos a 100k para no crashear el browser
  const rawStopTimes = getFile('stop_times.txt').slice(0, 100000)
  const stopTimes: GtfsStopTime[] = rawStopTimes.map((r) => ({
    trip_id: r.trip_id ?? '',
    stop_id: r.stop_id ?? '',
    arrival_time: r.arrival_time ?? '',
    departure_time: r.departure_time ?? '',
    stop_sequence: parseInt(r.stop_sequence ?? '0', 10),
    stop_headsign: r.stop_headsign || undefined,
    pickup_type: r.pickup_type ? parseInt(r.pickup_type, 10) : undefined,
    drop_off_type: r.drop_off_type ? parseInt(r.drop_off_type, 10) : undefined,
    timepoint: r.timepoint ? parseInt(r.timepoint, 10) : undefined,
  }))

  // ── Optional ──────────────────────────────────────────────────────────────

  const shapes: GtfsShape[] = getFile('shapes.txt').map((r) => ({
    shape_id: r.shape_id ?? '',
    shape_pt_lat: parseFloat(r.shape_pt_lat ?? '0'),
    shape_pt_lon: parseFloat(r.shape_pt_lon ?? '0'),
    shape_pt_sequence: parseInt(r.shape_pt_sequence ?? '0', 10),
    shape_dist_traveled: r.shape_dist_traveled ? parseFloat(r.shape_dist_traveled) : undefined,
  })).filter((s) => !isNaN(s.shape_pt_lat))

  const calendar: GtfsCalendar[] = getFile('calendar.txt').map((r) => ({
    service_id: r.service_id ?? '',
    monday: b(r.monday),
    tuesday: b(r.tuesday),
    wednesday: b(r.wednesday),
    thursday: b(r.thursday),
    friday: b(r.friday),
    saturday: b(r.saturday),
    sunday: b(r.sunday),
    start_date: r.start_date ?? '',
    end_date: r.end_date ?? '',
  }))

  const calendarDates: GtfsCalendarDate[] = getFile('calendar_dates.txt').map((r) => ({
    service_id: r.service_id ?? '',
    date: r.date ?? '',
    exception_type: parseInt(r.exception_type ?? '1', 10),
  }))

  const frequencies: GtfsFrequency[] = getFile('frequencies.txt').map((r) => ({
    trip_id: r.trip_id ?? '',
    start_time: r.start_time ?? '',
    end_time: r.end_time ?? '',
    headway_secs: parseInt(r.headway_secs ?? '0', 10),
    exact_times: r.exact_times ? parseInt(r.exact_times, 10) : undefined,
  }))

  const transfers: GtfsTransfer[] = getFile('transfers.txt').map((r) => ({
    from_stop_id: r.from_stop_id ?? '',
    to_stop_id: r.to_stop_id ?? '',
    transfer_type: parseInt(r.transfer_type ?? '0', 10),
    min_transfer_time: r.min_transfer_time ? parseInt(r.min_transfer_time, 10) : undefined,
    from_route_id: r.from_route_id || undefined,
    to_route_id: r.to_route_id || undefined,
    from_trip_id: r.from_trip_id || undefined,
    to_trip_id: r.to_trip_id || undefined,
  }))

  const feedInfoRows = getFile('feed_info.txt')
  const feedInfo: GtfsFeedInfo | null = feedInfoRows.length > 0 ? {
    feed_publisher_name: feedInfoRows[0].feed_publisher_name ?? '',
    feed_publisher_url: feedInfoRows[0].feed_publisher_url ?? '',
    feed_lang: feedInfoRows[0].feed_lang ?? '',
    default_lang: feedInfoRows[0].default_lang || undefined,
    feed_start_date: feedInfoRows[0].feed_start_date || undefined,
    feed_end_date: feedInfoRows[0].feed_end_date || undefined,
    feed_version: feedInfoRows[0].feed_version || undefined,
    feed_contact_email: feedInfoRows[0].feed_contact_email || undefined,
    feed_contact_url: feedInfoRows[0].feed_contact_url || undefined,
  } : null

  const fareAttributes: GtfsFareAttribute[] = getFile('fare_attributes.txt').map((r) => ({
    fare_id: r.fare_id ?? '',
    price: parseFloat(r.price ?? '0'),
    currency_type: r.currency_type ?? '',
    payment_method: parseInt(r.payment_method ?? '0', 10),
    transfers: parseInt(r.transfers ?? '0', 10),
    agency_id: r.agency_id || undefined,
    transfer_duration: r.transfer_duration ? parseInt(r.transfer_duration, 10) : undefined,
  }))

  // ── Indexes ───────────────────────────────────────────────────────────────

  const shapesByShapeId = new Map<string, GtfsShape[]>()
  for (const s of shapes) {
    const arr = shapesByShapeId.get(s.shape_id) ?? []
    arr.push(s)
    shapesByShapeId.set(s.shape_id, arr)
  }
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

  const calendarByServiceId = new Map(calendar.map((c) => [c.service_id, c]))

  const calendarDatesByServiceId = new Map<string, GtfsCalendarDate[]>()
  for (const cd of calendarDates) {
    const arr = calendarDatesByServiceId.get(cd.service_id) ?? []
    arr.push(cd)
    calendarDatesByServiceId.set(cd.service_id, arr)
  }

  const frequenciesByTripId = new Map<string, GtfsFrequency[]>()
  for (const f of frequencies) {
    const arr = frequenciesByTripId.get(f.trip_id) ?? []
    arr.push(f)
    frequenciesByTripId.set(f.trip_id, arr)
  }

  return {
    agencies,
    stops,
    routes,
    trips,
    stopTimes,
    shapes,
    calendar,
    calendarDates,
    frequencies,
    transfers,
    feedInfo,
    fareAttributes,
    availableFiles,
    shapesByShapeId,
    routeByTripId,
    stopById,
    tripsByRouteId,
    stopTimesByTripId,
    calendarByServiceId,
    calendarDatesByServiceId,
    frequenciesByTripId,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROUTE_TYPE_COLORS: Record<number, string> = {
  0: '#e63946',
  1: '#2563eb',
  2: '#7c3aed',
  3: '#16a34a',
  4: '#0891b2',
  5: '#d97706',
  6: '#db2777',
  7: '#65a30d',
  11: '#0d9488',
  12: '#1e40af',
}

export function routeColor(route: GtfsRoute): string {
  if (route.route_color) return `#${route.route_color}`
  return ROUTE_TYPE_COLORS[route.route_type] ?? '#6b7280'
}

export function routeTypeName(type: number): string {
  const names: Record<number, string> = {
    0: 'Tranvía', 1: 'Metro', 2: 'Ferrocarril', 3: 'Bus',
    4: 'Ferry', 5: 'Teleférico', 6: 'Góndola', 7: 'Funicular',
    11: 'Trolebús', 12: 'Monorraíl',
  }
  return names[type] ?? `Tipo ${type}`
}

export function formatDate(d: string): string {
  if (d.length !== 8) return d
  return `${d.slice(6, 8)}/${d.slice(4, 6)}/${d.slice(0, 4)}`
}

export function calendarDaysLabel(c: GtfsCalendar): string {
  const days = [
    c.monday && 'L', c.tuesday && 'M', c.wednesday && 'X',
    c.thursday && 'J', c.friday && 'V', c.saturday && 'S', c.sunday && 'D',
  ].filter(Boolean)
  return days.join(' ')
}

export function headwayLabel(secs: number): string {
  if (secs < 60) return `${secs}s`
  const min = Math.round(secs / 60)
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}
