import { useState, useMemo, useCallback, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap } from 'react-leaflet'
import { useDatasets } from '../hooks/useNap'
import { Header } from '../components/layout/Header'
import { parseGtfsZip, routeColor, routeTypeName, type GtfsData, type GtfsRoute } from '../lib/gtfsParser'
import { downloadGtfsZip } from '../lib/napClient'
import type { ConjuntoDatos, FicheroDto } from '../lib/types'
import 'leaflet/dist/leaflet.css'

// ── Subcomponente: ajustar bounds del mapa cuando cambian los datos ────────────
function MapBoundsAdjuster({ stops }: { stops: { lat: number; lon: number }[] }) {
  const map = useMap()
  useEffect(() => {
    if (stops.length === 0) return
    const lats = stops.map((s) => s.lat)
    const lons = stops.map((s) => s.lon)
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)],
    ]
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 })
  }, [map, stops])
  return null
}

// ── Tipos internos ────────────────────────────────────────────────────────────
type TabId = 'rutas' | 'paradas' | 'horarios'

interface SelectedFile {
  dataset: ConjuntoDatos
  fichero: FicheroDto
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function isGtfs(f: FicheroDto): boolean {
  return f.tipoFicheroNombre?.toLowerCase().includes('gtfs') ?? false
}

function getBadgeClass(type: number): string {
  const map: Record<number, string> = {
    0: 'bg-red-100 text-red-700',
    1: 'bg-blue-100 text-blue-700',
    2: 'bg-purple-100 text-purple-700',
    3: 'bg-green-100 text-green-700',
    4: 'bg-cyan-100 text-cyan-700',
  }
  return map[type] ?? 'bg-slate-100 text-slate-600'
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
  const [boundsKey, setBoundsKey] = useState(0)

  // Datasets con ficheros GTFS
  const gtfsDatasets = useMemo(() => {
    const all = response?.conjuntosDatoDto ?? []
    return all
      .map((ds) => ({
        dataset: ds,
        ficheros: (ds.ficherosDto ?? []).filter(isGtfs),
      }))
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

  // Descargar y parsear GTFS
  const loadGtfs = useCallback(async (item: SelectedFile) => {
    setSelected(item)
    setLoading(true)
    setError(null)
    setGtfs(null)
    setSelectedRoute(null)

    try {
      const zipBuffer = await downloadGtfsZip(item.fichero.ficheroId)
      const data = parseGtfsZip(zipBuffer)
      setGtfs(data)
      setBoundsKey((k) => k + 1)
      setActiveTab('rutas')
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  // Shapes a dibujar — si hay ruta seleccionada, solo sus shapes; si no, todas (max 30 para rendimiento)
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
    // Todas las rutas — una shape por ruta (la primera que tenga)
    return gtfs.routes.slice(0, 40).flatMap((route) => {
      const trips = gtfs.tripsByRouteId.get(route.route_id) ?? []
      const shapeId = trips.find((t) => t.shape_id)?.shape_id
      if (!shapeId) return []
      return [{
        shapeId,
        points: gtfs.shapesByShapeId.get(shapeId) ?? [],
        color: routeColor(route),
      }]
    })
  }, [gtfs, selectedRoute])

  // Paradas a mostrar — si hay ruta seleccionada, solo las de esa ruta
  const stopsToShow = useMemo(() => {
    if (!gtfs) return []
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
  }, [gtfs, selectedRoute])

  // Horarios del primer trip de la ruta seleccionada
  const scheduleRows = useMemo(() => {
    if (!gtfs || !selectedRoute) return []
    const trips = gtfs.tripsByRouteId.get(selectedRoute.route_id) ?? []
    const tripId = trips[0]?.trip_id
    if (!tripId) return []
    const times = gtfs.stopTimesByTripId.get(tripId) ?? []
    return times
      .sort((a, b) => a.stop_sequence - b.stop_sequence)
      .map((st) => ({
        seq: st.stop_sequence,
        stopName: gtfs.stopById.get(st.stop_id)?.stop_name ?? st.stop_id,
        arrival: st.arrival_time,
        departure: st.departure_time,
      }))
  }, [gtfs, selectedRoute])

  const mapCenter: [number, number] = gtfs && gtfs.stops.length > 0
    ? [gtfs.stops[0].stop_lat, gtfs.stops[0].stop_lon]
    : [40.416775, -3.70379]

  return (
    <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
      <Header
        title="Visualizador GTFS"
        subtitle="Explora rutas, paradas y horarios de cualquier dataset GTFS del catálogo NAP"
      />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Panel izquierdo: selector de dataset ──────────────────────── */}
        <div className="w-72 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-slate-100">
            <input
              type="text"
              placeholder="Buscar dataset GTFS..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="overflow-y-auto flex-1">
            {loadingCatalog ? (
              <div className="p-4 text-sm text-slate-400">Cargando catálogo...</div>
            ) : gtfsDatasets.length === 0 ? (
              <div className="p-4 text-sm text-slate-400">No se encontraron datasets GTFS.</div>
            ) : (
              gtfsDatasets.map(({ dataset, ficheros }) => (
                <div key={dataset.conjuntoDatoId} className="border-b border-slate-100">
                  <div className="px-3 py-2">
                    <p className="text-xs font-semibold text-slate-700 leading-tight line-clamp-2">
                      {dataset.nombre}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
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
                        className={`w-full text-left px-3 py-2 flex items-center gap-2 text-xs transition-colors ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-500'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-blue-500">⬇</span>
                        <span className="truncate">{f.tipoFicheroNombre}</span>
                        {f.numeroRutas != null && (
                          <span className="ml-auto text-slate-400 flex-shrink-0">
                            {f.numeroRutas} rutas
                          </span>
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
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Estado: cargando / error / sin datos */}
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3 text-slate-600">
                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium">Descargando y parseando GTFS...</p>
                <p className="text-xs text-slate-400">Los ficheros grandes pueden tardar unos segundos</p>
              </div>
            </div>
          )}
          {error && !loading && (
            <div className="m-4 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              <p className="font-semibold mb-1">Error cargando el GTFS</p>
              <p className="text-xs font-mono">{error}</p>
            </div>
          )}

          {/* Info rápida cuando hay datos */}
          {gtfs && !loading && (
            <div className="flex items-center gap-4 px-4 py-2 bg-white border-b border-slate-200 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">{selected?.dataset.nombre}</span>
              <span className="text-slate-300">|</span>
              <span>{gtfs.routes.length} rutas</span>
              <span className="text-slate-300">|</span>
              <span>{gtfs.stops.length} paradas</span>
              <span className="text-slate-300">|</span>
              <span>{gtfs.trips.length} viajes</span>
              {gtfs.agencies[0] && (
                <>
                  <span className="text-slate-300">|</span>
                  <span>{gtfs.agencies[0].agency_name}</span>
                </>
              )}
              {selectedRoute && (
                <>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={() => setSelectedRoute(null)}
                    className="text-blue-600 hover:underline"
                  >
                    ← Todas las rutas
                  </button>
                </>
              )}
            </div>
          )}

          <div className="flex flex-1 overflow-hidden">
            {/* Mapa */}
            <div className="flex-1 relative">
              {!gtfs && !loading && !error ? (
                <div className="flex items-center justify-center h-full text-slate-400 flex-col gap-3">
                  <div className="text-5xl">🗺️</div>
                  <p className="text-sm">Selecciona un dataset GTFS de la lista para visualizarlo</p>
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
                    <MapBoundsAdjuster
                      stops={stopsToShow.map((s) => ({ lat: s.stop_lat, lon: s.stop_lon }))}
                    />
                  )}

                  {/* Trazados de rutas */}
                  {shapesToDraw.map((s, idx) => (
                    <Polyline
                      key={`${s.shapeId}-${idx}`}
                      positions={s.points.map((p) => [p.shape_pt_lat, p.shape_pt_lon])}
                      pathOptions={{ color: s.color, weight: selectedRoute ? 3 : 2, opacity: 0.85 }}
                    />
                  ))}

                  {/* Paradas */}
                  {stopsToShow.map((stop) => (
                    <CircleMarker
                      key={stop.stop_id}
                      center={[stop.stop_lat, stop.stop_lon]}
                      radius={selectedRoute ? 5 : 3}
                      pathOptions={{
                        color: selectedRoute ? routeColor(selectedRoute) : '#2563eb',
                        fillColor: '#fff',
                        fillOpacity: 1,
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <div className="text-sm min-w-36">
                          <p className="font-bold text-slate-800">{stop.stop_name}</p>
                          {stop.stop_code && (
                            <p className="text-xs text-slate-400">Código: {stop.stop_code}</p>
                          )}
                          {stop.stop_desc && (
                            <p className="text-xs text-slate-500 mt-1">{stop.stop_desc}</p>
                          )}
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

            {/* ── Panel derecho: tabs ──────────────────────────────────── */}
            {gtfs && (
              <div className="w-72 bg-white border-l border-slate-200 flex flex-col flex-shrink-0 overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-slate-200">
                  {(['rutas', 'paradas', 'horarios'] as TabId[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${
                        activeTab === tab
                          ? 'border-b-2 border-blue-500 text-blue-600'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto">
                  {/* Tab Rutas */}
                  {activeTab === 'rutas' && (
                    <div className="divide-y divide-slate-100">
                      {gtfs.routes.map((route) => (
                        <button
                          key={route.route_id}
                          onClick={() => setSelectedRoute(
                            selectedRoute?.route_id === route.route_id ? null : route
                          )}
                          className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 hover:bg-slate-50 transition-colors ${
                            selectedRoute?.route_id === route.route_id ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: routeColor(route) }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              {route.route_short_name && (
                                <span
                                  className="text-xs font-bold px-1.5 py-0.5 rounded text-white flex-shrink-0"
                                  style={{ backgroundColor: routeColor(route) }}
                                >
                                  {route.route_short_name}
                                </span>
                              )}
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${getBadgeClass(route.route_type)}`}
                              >
                                {routeTypeName(route.route_type)}
                              </span>
                            </div>
                            {route.route_long_name && (
                              <p className="text-xs text-slate-600 mt-0.5 leading-tight truncate">
                                {route.route_long_name}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Tab Paradas */}
                  {activeTab === 'paradas' && (
                    <div>
                      <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                        <p className="text-xs text-slate-500">
                          {gtfs.stops.length} paradas en total
                          {gtfs.stops.length > 500 && ' · mostrando las primeras 500 en el mapa'}
                        </p>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {(selectedRoute
                          ? stopsToShow
                          : gtfs.stops.slice(0, 100)
                        ).map((stop) => (
                          <div key={stop.stop_id} className="px-3 py-2">
                            <p className="text-xs font-medium text-slate-700 line-clamp-1">
                              {stop.stop_name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {stop.stop_lat.toFixed(4)}, {stop.stop_lon.toFixed(4)}
                            </p>
                          </div>
                        ))}
                        {!selectedRoute && gtfs.stops.length > 100 && (
                          <p className="px-3 py-3 text-xs text-slate-400 text-center">
                            Selecciona una ruta para ver sus paradas
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tab Horarios */}
                  {activeTab === 'horarios' && (
                    <div>
                      {!selectedRoute ? (
                        <div className="p-4 text-xs text-slate-400 text-center mt-4">
                          Selecciona una ruta en la pestaña "Rutas" para ver sus horarios
                        </div>
                      ) : scheduleRows.length === 0 ? (
                        <div className="p-4 text-xs text-slate-400 text-center mt-4">
                          No hay datos de horarios para esta ruta
                        </div>
                      ) : (
                        <div>
                          <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                            <p className="text-xs font-semibold text-slate-600">
                              {selectedRoute.route_short_name} — {selectedRoute.route_long_name}
                            </p>
                            <p className="text-xs text-slate-400">Primer viaje del día</p>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {scheduleRows.map((row) => (
                              <div
                                key={`${row.seq}-${row.stopName}`}
                                className="px-3 py-2 flex items-center gap-2"
                              >
                                <span className="text-xs font-bold text-slate-400 w-5 flex-shrink-0">
                                  {row.seq}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-slate-700 truncate">
                                    {row.stopName}
                                  </p>
                                </div>
                                <span className="text-xs font-mono text-blue-600 flex-shrink-0">
                                  {row.departure}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
