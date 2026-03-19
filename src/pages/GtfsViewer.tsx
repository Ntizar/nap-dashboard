import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap } from 'react-leaflet'
import { useDatasets } from '../hooks/useNap'
import { Header } from '../components/layout/Header'
import {
  parseGtfsZip, routeColor, routeTypeName, formatDate, calendarDaysLabel, headwayLabel,
  type GtfsData, type GtfsRoute, type GtfsTrip,
} from '../lib/gtfsParser'
import { downloadGtfsZip } from '../lib/napClient'
import type { ConjuntoDatos, FicheroDto } from '../lib/types'
import 'leaflet/dist/leaflet.css'

// ── MapBoundsAdjuster ─────────────────────────────────────────────────────────
function MapBoundsAdjuster({ stops }: { stops: { lat: number; lon: number }[] }) {
  const map = useMap()
  useEffect(() => {
    if (stops.length === 0) return
    const lats = stops.map((s) => s.lat)
    const lons = stops.map((s) => s.lon)
    map.fitBounds(
      [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]],
      { padding: [30, 30], maxZoom: 14 }
    )
  }, [map, stops])
  return null
}

// ── Tipos internos ────────────────────────────────────────────────────────────
type TabId = 'rutas' | 'paradas' | 'horarios' | 'info'

interface SelectedFile { dataset: ConjuntoDatos; fichero: FicheroDto }

function isGtfs(f: FicheroDto): boolean {
  return f.tipoFicheroNombre?.toLowerCase().includes('gtfs') ?? false
}

// ── Helpers UI ────────────────────────────────────────────────────────────────
function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold text-white flex-shrink-0"
      style={{ backgroundColor: color }}
    >
      {children}
    </span>
  )
}

function Tag({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${className}`}>
      {children}
    </span>
  )
}

function Pill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-semibold text-slate-700">{value}</span>
    </div>
  )
}

const ROUTE_TYPE_COLORS_BG: Record<number, string> = {
  0: 'bg-red-100 text-red-700', 1: 'bg-blue-100 text-blue-700',
  2: 'bg-purple-100 text-purple-700', 3: 'bg-green-100 text-green-700',
  4: 'bg-cyan-100 text-cyan-700', 5: 'bg-amber-100 text-amber-700',
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function GtfsViewer() {
  const { data: response, isLoading: loadingCatalog } = useDatasets()

  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<SelectedFile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gtfs, setGtfs] = useState<GtfsData | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('rutas')
  const [selectedRoute, setSelectedRoute] = useState<GtfsRoute | null>(null)
  const [selectedTrip, setSelectedTrip] = useState<GtfsTrip | null>(null)
  const [boundsKey, setBoundsKey] = useState(0)
  const [stopSearch, setStopSearch] = useState('')
  const [routeSearch, setRouteSearch] = useState('')
  const scheduleRef = useRef<HTMLDivElement>(null)

  // Datasets GTFS filtrados
  const gtfsDatasets = useMemo(() => {
    const all = response?.conjuntosDatoDto ?? []
    return all
      .map((ds) => ({ dataset: ds, ficheros: (ds.ficherosDto ?? []).filter(isGtfs) }))
      .filter((d) => d.ficheros.length > 0)
      .filter((d) => {
        if (!search) return true
        const q = search.toLowerCase()
        return (
          d.dataset.nombre?.toLowerCase().includes(q) ||
          d.dataset.organizacion?.nombre?.toLowerCase().includes(q)
        )
      })
  }, [response, search])

  // Tabs disponibles según datos presentes
  const availableTabs = useMemo((): TabId[] => {
    if (!gtfs) return []
    const tabs: TabId[] = ['rutas', 'paradas']
    if (gtfs.stopTimes.length > 0) tabs.push('horarios')
    tabs.push('info')
    return tabs
  }, [gtfs])

  // Descargar y parsear
  const loadGtfs = useCallback(async (item: SelectedFile) => {
    setSelected(item)
    setLoading(true)
    setError(null)
    setGtfs(null)
    setSelectedRoute(null)
    setSelectedTrip(null)
    setActiveTab('rutas')

    try {
      const zipBuffer = await downloadGtfsZip(item.fichero.ficheroId)
      const data = parseGtfsZip(zipBuffer)
      setGtfs(data)
      setBoundsKey((k) => k + 1)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  // Al seleccionar ruta, auto-seleccionar primer trip
  const handleSelectRoute = useCallback((route: GtfsRoute | null) => {
    setSelectedRoute(route)
    if (route && gtfs) {
      const trips = gtfs.tripsByRouteId.get(route.route_id) ?? []
      setSelectedTrip(trips[0] ?? null)
    } else {
      setSelectedTrip(null)
    }
  }, [gtfs])

  // Rutas filtradas
  const filteredRoutes = useMemo(() => {
    if (!gtfs) return []
    if (!routeSearch) return gtfs.routes
    const q = routeSearch.toLowerCase()
    return gtfs.routes.filter((r) =>
      r.route_short_name.toLowerCase().includes(q) ||
      r.route_long_name.toLowerCase().includes(q) ||
      r.route_id.toLowerCase().includes(q)
    )
  }, [gtfs, routeSearch])

  // Shapes a dibujar
  const shapesToDraw = useMemo(() => {
    if (!gtfs) return []
    if (selectedRoute) {
      const trips = gtfs.tripsByRouteId.get(selectedRoute.route_id) ?? []
      const shapeIds = [...new Set(trips.map((t) => t.shape_id).filter(Boolean) as string[])]
      return shapeIds.map((id) => ({
        shapeId: id,
        points: gtfs.shapesByShapeId.get(id) ?? [],
        color: routeColor(selectedRoute),
      }))
    }
    return gtfs.routes.slice(0, 60).flatMap((route) => {
      const trips = gtfs.tripsByRouteId.get(route.route_id) ?? []
      const shapeId = trips.find((t) => t.shape_id)?.shape_id
      if (!shapeId) return []
      return [{ shapeId, points: gtfs.shapesByShapeId.get(shapeId) ?? [], color: routeColor(route) }]
    })
  }, [gtfs, selectedRoute])

  // Paradas a mostrar
  const stopsToShow = useMemo(() => {
    if (!gtfs) return []
    if (selectedTrip) {
      const times = gtfs.stopTimesByTripId.get(selectedTrip.trip_id) ?? []
      return times
        .sort((a, b) => a.stop_sequence - b.stop_sequence)
        .map((st) => gtfs.stopById.get(st.stop_id))
        .filter(Boolean) as typeof gtfs.stops
    }
    if (selectedRoute) {
      const trips = gtfs.tripsByRouteId.get(selectedRoute.route_id) ?? []
      const tripId = trips[0]?.trip_id
      if (!tripId) return gtfs.stops.slice(0, 500)
      const times = gtfs.stopTimesByTripId.get(tripId) ?? []
      return times
        .sort((a, b) => a.stop_sequence - b.stop_sequence)
        .map((st) => gtfs.stopById.get(st.stop_id))
        .filter(Boolean) as typeof gtfs.stops
    }
    return gtfs.stops.slice(0, 500)
  }, [gtfs, selectedRoute, selectedTrip])

  // Paradas panel (filtradas por búsqueda)
  const filteredStops = useMemo(() => {
    const base = selectedRoute ? stopsToShow : (gtfs?.stops.slice(0, 200) ?? [])
    if (!stopSearch) return base
    const q = stopSearch.toLowerCase()
    return base.filter((s) => s.stop_name.toLowerCase().includes(q) || (s.stop_code ?? '').toLowerCase().includes(q))
  }, [stopsToShow, gtfs, selectedRoute, stopSearch])

  // Trips de la ruta seleccionada (agrupados por direction)
  const tripsByDirection = useMemo(() => {
    if (!gtfs || !selectedRoute) return { '0': [], '1': [], undefined: [] } as Record<string, GtfsTrip[]>
    const trips = gtfs.tripsByRouteId.get(selectedRoute.route_id) ?? []
    const groups: Record<string, GtfsTrip[]> = {}
    for (const t of trips) {
      const dir = t.direction_id ?? 'undef'
      groups[dir] = groups[dir] ?? []
      groups[dir].push(t)
    }
    return groups
  }, [gtfs, selectedRoute])

  // Horario del trip seleccionado
  const scheduleRows = useMemo(() => {
    if (!gtfs || !selectedTrip) return []
    const times = gtfs.stopTimesByTripId.get(selectedTrip.trip_id) ?? []
    return times
      .sort((a, b) => a.stop_sequence - b.stop_sequence)
      .map((st) => ({
        seq: st.stop_sequence,
        stopName: gtfs.stopById.get(st.stop_id)?.stop_name ?? st.stop_id,
        stopCode: gtfs.stopById.get(st.stop_id)?.stop_code,
        arrival: st.arrival_time,
        departure: st.departure_time,
        pickup: st.pickup_type,
        dropOff: st.drop_off_type,
        headsign: st.stop_headsign,
      }))
  }, [gtfs, selectedTrip])

  // Frecuencias del trip seleccionado
  const tripFrequencies = useMemo(() => {
    if (!gtfs || !selectedTrip) return []
    return gtfs.frequenciesByTripId.get(selectedTrip.trip_id) ?? []
  }, [gtfs, selectedTrip])

  // Calendario del trip seleccionado
  const tripCalendar = useMemo(() => {
    if (!gtfs || !selectedTrip) return null
    return gtfs.calendarByServiceId.get(selectedTrip.service_id) ?? null
  }, [gtfs, selectedTrip])

  const tripCalendarDates = useMemo(() => {
    if (!gtfs || !selectedTrip) return []
    return gtfs.calendarDatesByServiceId.get(selectedTrip.service_id) ?? []
  }, [gtfs, selectedTrip])

  const mapCenter: [number, number] = gtfs && gtfs.stops.length > 0
    ? [gtfs.stops[0].stop_lat, gtfs.stops[0].stop_lon]
    : [40.416775, -3.70379]

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#f4f6f8' }}>
      <Header
        title="Visualizador GTFS"
        subtitle="Explora rutas, paradas y horarios de cualquier dataset GTFS del catálogo NAP"
      />

      <div className="flex flex-1 overflow-hidden">

        {/* ── Panel izquierdo: selector ──────────────────────────────────── */}
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 shadow-sm">
          <div className="p-3 border-b border-slate-100">
            <input
              type="text"
              placeholder="Buscar dataset GTFS..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-nap-blue bg-slate-50"
            />
          </div>

          <div className="overflow-y-auto flex-1 text-xs">
            {loadingCatalog ? (
              <div className="p-4 text-slate-400 text-center">Cargando catálogo...</div>
            ) : gtfsDatasets.length === 0 ? (
              <div className="p-4 text-slate-400 text-center">No se encontraron datasets GTFS.</div>
            ) : (
              gtfsDatasets.map(({ dataset, ficheros }) => (
                <div key={dataset.conjuntoDatoId} className="border-b border-slate-100">
                  <div className="px-3 pt-2 pb-1">
                    <p className="font-semibold text-slate-700 leading-tight line-clamp-2">
                      {dataset.nombre}
                    </p>
                    <p className="text-slate-400 mt-0.5 truncate">
                      {dataset.organizacion?.nombre ?? '—'}
                    </p>
                  </div>
                  {ficheros.map((f) => {
                    const isActive = selected?.fichero.ficheroId === f.ficheroId
                    return (
                      <button
                        key={f.ficheroId}
                        onClick={() => loadGtfs({ dataset, fichero: f })}
                        disabled={loading}
                        className={`w-full text-left px-3 py-1.5 flex items-center gap-2 transition-colors ${
                          isActive
                            ? 'bg-blue-50 text-nap-blue border-l-2 border-nap-blue font-semibold'
                            : 'text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-slate-400">↓</span>
                        <span className="truncate flex-1">{f.tipoFicheroNombre}</span>
                        {f.numeroRutas != null && (
                          <span className="text-slate-400 flex-shrink-0">{f.numeroRutas}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Panel central: mapa ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden relative">

          {/* Barra de estado */}
          {gtfs && !loading && (
            <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-slate-200 text-xs text-slate-600 flex-wrap">
              <span className="font-semibold text-slate-800 truncate max-w-xs">{selected?.dataset.nombre}</span>
              <span className="text-slate-300">|</span>
              <span className="text-nap-blue font-medium">{gtfs.routes.length} rutas</span>
              <span className="text-slate-300">|</span>
              <span>{gtfs.stops.length} paradas</span>
              <span className="text-slate-300">|</span>
              <span>{gtfs.trips.length} viajes</span>
              {gtfs.agencies[0] && (
                <>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-500">{gtfs.agencies[0].agency_name}</span>
                </>
              )}
              {selectedRoute && (
                <>
                  <span className="text-slate-300">|</span>
                  <button onClick={() => { handleSelectRoute(null); setActiveTab('rutas') }}
                    className="text-nap-blue hover:underline font-medium">
                    ← Todas las rutas
                  </button>
                </>
              )}
            </div>
          )}

          {/* Overlay de carga */}
          {loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3 text-slate-600">
                <div className="w-10 h-10 border-2 border-nap-blue border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium">Descargando y procesando GTFS...</p>
                <p className="text-xs text-slate-400">Los ficheros grandes pueden tardar unos segundos</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="m-4 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              <p className="font-semibold mb-1">Error cargando el GTFS</p>
              <p className="text-xs font-mono break-all">{error}</p>
            </div>
          )}

          {/* Mapa */}
          <div className="flex-1 relative">
            {!gtfs && !loading && !error ? (
              <div className="flex items-center justify-center h-full flex-col gap-3 text-slate-400">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-2xl">
                  🗺
                </div>
                <p className="text-sm">Selecciona un dataset GTFS de la lista</p>
              </div>
            ) : (
              <MapContainer
                key={`map-${boundsKey}`}
                center={mapCenter}
                zoom={10}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {gtfs && stopsToShow.length > 0 && (
                  <MapBoundsAdjuster stops={stopsToShow.map((s) => ({ lat: s.stop_lat, lon: s.stop_lon }))} />
                )}
                {shapesToDraw.map((s, idx) => (
                  <Polyline
                    key={`${s.shapeId}-${idx}`}
                    positions={s.points.map((p) => [p.shape_pt_lat, p.shape_pt_lon])}
                    pathOptions={{ color: s.color, weight: selectedRoute ? 4 : 2, opacity: 0.85 }}
                  />
                ))}
                {stopsToShow.map((stop) => (
                  <CircleMarker
                    key={stop.stop_id}
                    center={[stop.stop_lat, stop.stop_lon]}
                    radius={selectedRoute ? 5 : 3}
                    pathOptions={{
                      color: selectedRoute ? routeColor(selectedRoute) : '#1a56a0',
                      fillColor: '#fff',
                      fillOpacity: 1,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div className="text-sm min-w-40">
                        <p className="font-bold text-slate-800">{stop.stop_name}</p>
                        {stop.stop_code && <p className="text-xs text-slate-400">Código: {stop.stop_code}</p>}
                        {stop.stop_desc && <p className="text-xs text-slate-500 mt-1">{stop.stop_desc}</p>}
                        {stop.platform_code && <p className="text-xs text-slate-400">Andén: {stop.platform_code}</p>}
                        <p className="text-xs text-slate-400 mt-1">
                          {stop.stop_lat.toFixed(5)}, {stop.stop_lon.toFixed(5)}
                        </p>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            )}
          </div>
        </div>

        {/* ── Panel derecho: tabs ──────────────────────────────────────────── */}
        {gtfs && (
          <div className="w-80 bg-white border-l border-slate-200 flex flex-col flex-shrink-0 shadow-sm">
            {/* Tabs */}
            <div className="flex border-b border-slate-200 flex-shrink-0">
              {availableTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${
                    activeTab === tab
                      ? 'border-b-2 border-nap-blue text-nap-blue'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab === 'info' ? 'Información' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* ── Tab Rutas ───────────────────────────────────────────────── */}
            {activeTab === 'rutas' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="p-2 border-b border-slate-100 flex-shrink-0">
                  <input
                    type="text"
                    placeholder="Buscar ruta..."
                    value={routeSearch}
                    onChange={(e) => setRouteSearch(e.target.value)}
                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-nap-blue bg-slate-50"
                  />
                </div>
                <div className="overflow-y-auto flex-1">
                  {filteredRoutes.map((route) => {
                    const trips = gtfs.tripsByRouteId.get(route.route_id) ?? []
                    const isActive = selectedRoute?.route_id === route.route_id
                    return (
                      <button
                        key={route.route_id}
                        onClick={() => {
                          handleSelectRoute(isActive ? null : route)
                          setActiveTab('rutas')
                        }}
                        className={`w-full text-left px-3 py-2.5 border-b border-slate-100 flex items-start gap-2.5 hover:bg-slate-50 transition-colors ${
                          isActive ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: routeColor(route) }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {route.route_short_name && (
                              <Badge color={routeColor(route)}>{route.route_short_name}</Badge>
                            )}
                            <Tag className={ROUTE_TYPE_COLORS_BG[route.route_type] ?? 'bg-slate-100 text-slate-600'}>
                              {routeTypeName(route.route_type)}
                            </Tag>
                          </div>
                          {route.route_long_name && (
                            <p className="text-xs text-slate-600 mt-0.5 leading-tight line-clamp-2">
                              {route.route_long_name}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-400 mt-0.5">{trips.length} viajes</p>
                        </div>
                      </button>
                    )
                  })}
                  {filteredRoutes.length === 0 && (
                    <p className="p-4 text-xs text-slate-400 text-center">No se encontraron rutas</p>
                  )}
                </div>
              </div>
            )}

            {/* ── Tab Paradas ─────────────────────────────────────────────── */}
            {activeTab === 'paradas' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="p-2 border-b border-slate-100 flex-shrink-0">
                  <input
                    type="text"
                    placeholder="Buscar parada..."
                    value={stopSearch}
                    onChange={(e) => setStopSearch(e.target.value)}
                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-nap-blue bg-slate-50"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 px-1">
                    {gtfs.stops.length} paradas totales
                    {!selectedRoute && gtfs.stops.length > 200 && ' · mostrando 200'}
                  </p>
                </div>
                <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                  {filteredStops.map((stop) => (
                    <div key={stop.stop_id} className="px-3 py-2">
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-nap-blue mt-1.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-700 line-clamp-1">{stop.stop_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {stop.stop_code && (
                              <span className="text-[10px] text-slate-400">#{stop.stop_code}</span>
                            )}
                            {stop.platform_code && (
                              <span className="text-[10px] text-slate-400">Andén {stop.platform_code}</span>
                            )}
                            {stop.wheelchair_boarding === 1 && (
                              <span className="text-[10px] text-blue-500">♿</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Tab Horarios ─────────────────────────────────────────────── */}
            {activeTab === 'horarios' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                {!selectedRoute ? (
                  <div className="flex flex-col items-center justify-center flex-1 gap-2 text-slate-400 px-4 text-center">
                    <span className="text-3xl">🕐</span>
                    <p className="text-xs">Selecciona una ruta en la pestaña Rutas para ver sus horarios</p>
                  </div>
                ) : (
                  <>
                    {/* Selector de viaje por dirección */}
                    <div className="flex-shrink-0 border-b border-slate-100 overflow-y-auto max-h-48">
                      {Object.entries(tripsByDirection).map(([dir, dirTrips]) => {
                        if (dirTrips.length === 0) return null
                        const label = dir === '0' ? 'Ida' : dir === '1' ? 'Vuelta' : 'Todos los viajes'
                        const firstDep = (trip: GtfsTrip) => {
                          const times = gtfs.stopTimesByTripId.get(trip.trip_id) ?? []
                          const sorted = [...times].sort((a, b) => a.stop_sequence - b.stop_sequence)
                          return sorted[0]?.departure_time ?? ''
                        }
                        const sorted = [...dirTrips].sort((a, b) =>
                          firstDep(a).localeCompare(firstDep(b))
                        )
                        return (
                          <div key={dir} className="px-2 py-1.5">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-1">
                              {label} · {dirTrips.length} viajes
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {sorted.slice(0, 60).map((trip) => {
                                const dep = firstDep(trip)
                                const isActive = selectedTrip?.trip_id === trip.trip_id
                                return (
                                  <button
                                    key={trip.trip_id}
                                    onClick={() => setSelectedTrip(trip)}
                                    title={trip.trip_headsign ?? trip.trip_id}
                                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors ${
                                      isActive
                                        ? 'bg-nap-blue text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                  >
                                    {dep || trip.trip_short_name || trip.trip_id.slice(-4)}
                                  </button>
                                )
                              })}
                              {sorted.length > 60 && (
                                <span className="text-[10px] text-slate-400 self-center px-1">
                                  +{sorted.length - 60} más
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Detalle del trip seleccionado */}
                    {selectedTrip ? (
                      <div className="flex-1 overflow-y-auto" ref={scheduleRef}>
                        {/* Cabecera del trip */}
                        <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {selectedRoute.route_short_name && (
                              <Badge color={routeColor(selectedRoute)}>{selectedRoute.route_short_name}</Badge>
                            )}
                            {selectedTrip.trip_headsign && (
                              <span className="text-xs font-medium text-slate-700 truncate">
                                → {selectedTrip.trip_headsign}
                              </span>
                            )}
                          </div>
                          {/* Calendario del servicio */}
                          {tripCalendar && (
                            <p className="text-[10px] text-slate-500 mt-1">
                              <span className="font-semibold">{calendarDaysLabel(tripCalendar)}</span>
                              {' '}·{' '}{formatDate(tripCalendar.start_date)} – {formatDate(tripCalendar.end_date)}
                            </p>
                          )}
                          {/* Frecuencias si las hay */}
                          {tripFrequencies.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {tripFrequencies.map((f, i) => (
                                <p key={i} className="text-[10px] text-slate-500">
                                  {f.start_time}–{f.end_time}: cada {headwayLabel(f.headway_secs)}
                                  {f.exact_times === 1 && ' (exacto)'}
                                </p>
                              ))}
                            </div>
                          )}
                          {/* Accesibilidad */}
                          <div className="flex gap-2 mt-1">
                            {selectedTrip.wheelchair_accessible === 1 && (
                              <span className="text-[10px] text-blue-600">♿ Accesible</span>
                            )}
                            {selectedTrip.bikes_allowed === 1 && (
                              <span className="text-[10px] text-green-600">🚲 Bicicletas</span>
                            )}
                          </div>
                        </div>

                        {/* Paradas del trip */}
                        {scheduleRows.length === 0 ? (
                          <p className="p-4 text-xs text-slate-400 text-center">Sin datos de horario para este viaje</p>
                        ) : (
                          <div className="relative">
                            {/* Línea vertical de timeline */}
                            <div className="absolute left-[26px] top-0 bottom-0 w-px bg-slate-200 z-0" />
                            {scheduleRows.map((row, i) => {
                              const isFirst = i === 0
                              const isLast = i === scheduleRows.length - 1
                              return (
                                <div key={`${row.seq}-${row.stopName}`} className="flex items-center gap-2 px-3 py-1.5 relative z-10 hover:bg-slate-50">
                                  {/* Dot */}
                                  <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 bg-white z-10 ${
                                    isFirst || isLast
                                      ? 'border-nap-blue'
                                      : 'border-slate-300'
                                  }`}
                                    style={isFirst || isLast ? { borderColor: routeColor(selectedRoute) } : {}}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-xs leading-tight line-clamp-1 ${
                                      isFirst || isLast ? 'font-semibold text-slate-800' : 'text-slate-600'
                                    }`}>
                                      {row.stopName}
                                    </p>
                                    {row.headsign && (
                                      <p className="text-[10px] text-slate-400 truncate">→ {row.headsign}</p>
                                    )}
                                    {row.stopCode && (
                                      <p className="text-[10px] text-slate-400">#{row.stopCode}</p>
                                    )}
                                  </div>
                                  <div className="flex-shrink-0 text-right">
                                    <span className="text-xs font-mono font-semibold text-nap-blue">
                                      {row.departure || row.arrival}
                                    </span>
                                    {row.arrival && row.departure && row.arrival !== row.departure && (
                                      <p className="text-[10px] font-mono text-slate-400">{row.arrival}</p>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Excepciones de calendario */}
                        {tripCalendarDates.length > 0 && (
                          <div className="px-3 py-2 border-t border-slate-100 mt-2">
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                              Excepciones de servicio
                            </p>
                            <div className="space-y-0.5 max-h-24 overflow-y-auto">
                              {tripCalendarDates.map((cd, i) => (
                                <p key={i} className={`text-[10px] ${cd.exception_type === 1 ? 'text-green-600' : 'text-red-500'}`}>
                                  {cd.exception_type === 1 ? '+ ' : '− '}{formatDate(cd.date)}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center flex-1 text-slate-400 gap-2 px-4 text-center">
                        <p className="text-xs">Selecciona un viaje de la lista para ver sus paradas y horarios</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Tab Información ──────────────────────────────────────────── */}
            {activeTab === 'info' && (
              <div className="flex-1 overflow-y-auto p-3 text-xs space-y-4">

                {/* Feed info */}
                {gtfs.feedInfo && (
                  <section>
                    <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Información del feed
                    </h4>
                    <div className="bg-slate-50 rounded-lg p-2.5 space-y-0.5">
                      <Pill label="Publicador" value={gtfs.feedInfo.feed_publisher_name} />
                      {gtfs.feedInfo.feed_version && <Pill label="Versión" value={gtfs.feedInfo.feed_version} />}
                      {gtfs.feedInfo.feed_start_date && (
                        <Pill label="Vigencia" value={`${formatDate(gtfs.feedInfo.feed_start_date)} – ${formatDate(gtfs.feedInfo.feed_end_date ?? '')}`} />
                      )}
                      <Pill label="Idioma" value={gtfs.feedInfo.feed_lang} />
                      {gtfs.feedInfo.feed_contact_email && (
                        <Pill label="Contacto" value={gtfs.feedInfo.feed_contact_email} />
                      )}
                    </div>
                  </section>
                )}

                {/* Agencias */}
                {gtfs.agencies.length > 0 && (
                  <section>
                    <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Agencias ({gtfs.agencies.length})
                    </h4>
                    <div className="space-y-1.5">
                      {gtfs.agencies.map((ag, i) => (
                        <div key={i} className="bg-slate-50 rounded-lg p-2.5">
                          <p className="font-semibold text-slate-700">{ag.agency_name}</p>
                          {ag.agency_timezone && <p className="text-[10px] text-slate-400">{ag.agency_timezone}</p>}
                          {ag.agency_phone && <p className="text-[10px] text-slate-500 mt-0.5">Tel: {ag.agency_phone}</p>}
                          {ag.agency_url && (
                            <a href={ag.agency_url} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] text-nap-blue hover:underline mt-0.5 block truncate">
                              {ag.agency_url}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Estadísticas */}
                <section>
                  <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Estadísticas del feed
                  </h4>
                  <div className="bg-slate-50 rounded-lg p-2.5 space-y-0.5">
                    <Pill label="Rutas" value={gtfs.routes.length} />
                    <Pill label="Paradas" value={gtfs.stops.length} />
                    <Pill label="Viajes" value={gtfs.trips.length} />
                    <Pill label="Registros horarios" value={gtfs.stopTimes.length >= 100000 ? '100.000+ (limitado)' : gtfs.stopTimes.length} />
                    {gtfs.shapes.length > 0 && <Pill label="Puntos de trazado" value={gtfs.shapes.length} />}
                    {gtfs.calendar.length > 0 && <Pill label="Servicios calendario" value={gtfs.calendar.length} />}
                    {gtfs.calendarDates.length > 0 && <Pill label="Excepciones" value={gtfs.calendarDates.length} />}
                    {gtfs.frequencies.length > 0 && <Pill label="Frecuencias" value={gtfs.frequencies.length} />}
                    {gtfs.transfers.length > 0 && <Pill label="Transbordos" value={gtfs.transfers.length} />}
                    {gtfs.fareAttributes.length > 0 && <Pill label="Tarifas" value={gtfs.fareAttributes.length} />}
                  </div>
                </section>

                {/* Archivos presentes */}
                <section>
                  <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Archivos incluidos
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {gtfs.availableFiles.map((f) => (
                      <span key={f} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                        {f}
                      </span>
                    ))}
                  </div>
                </section>

                {/* Tarifas */}
                {gtfs.fareAttributes.length > 0 && (
                  <section>
                    <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Tarifas
                    </h4>
                    <div className="space-y-1">
                      {gtfs.fareAttributes.map((f) => (
                        <div key={f.fare_id} className="bg-slate-50 rounded p-2 flex justify-between items-center">
                          <span className="text-slate-600">{f.fare_id}</span>
                          <span className="font-semibold text-slate-800">{f.price} {f.currency_type}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Transbordos */}
                {gtfs.transfers.length > 0 && (
                  <section>
                    <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Transbordos ({gtfs.transfers.length})
                    </h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {gtfs.transfers.slice(0, 50).map((t, i) => {
                        const typeLabels = ['Recomendado', 'Cronometrado', 'Tiempo mín.', 'No posible']
                        return (
                          <div key={i} className="bg-slate-50 rounded p-2 text-[10px]">
                            <div className="flex items-center gap-1 text-slate-600">
                              <span className="truncate max-w-[45%]">
                                {gtfs.stopById.get(t.from_stop_id)?.stop_name ?? t.from_stop_id}
                              </span>
                              <span className="text-slate-400 flex-shrink-0">→</span>
                              <span className="truncate max-w-[45%]">
                                {gtfs.stopById.get(t.to_stop_id)?.stop_name ?? t.to_stop_id}
                              </span>
                            </div>
                            <div className="flex gap-2 mt-0.5">
                              <span className="text-slate-400">{typeLabels[t.transfer_type] ?? t.transfer_type}</span>
                              {t.min_transfer_time != null && (
                                <span className="text-slate-400">{headwayLabel(t.min_transfer_time)}</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      {gtfs.transfers.length > 50 && (
                        <p className="text-[10px] text-slate-400 text-center py-1">
                          +{gtfs.transfers.length - 50} transbordos más
                        </p>
                      )}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
