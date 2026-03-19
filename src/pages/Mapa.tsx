import { useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { useDatasets } from '../hooks/useNap'
import { Header } from '../components/layout/Header'
import type { ConjuntoDatos } from '../lib/types'
import 'leaflet/dist/leaflet.css'

// Coordenadas aproximadas por nombre de provincia — para posicionar pins en el mapa
const REGION_COORDS: Record<string, [number, number]> = {
  'Madrid': [40.4168, -3.7038],
  'Barcelona': [41.3851, 2.1734],
  'Valencia': [39.4699, -0.3763],
  'Sevilla': [37.3891, -5.9845],
  'Zaragoza': [41.6488, -0.8891],
  'Málaga': [36.7213, -4.4213],
  'Murcia': [37.9922, -1.1307],
  'Illes Balears': [39.5696, 2.6502],
  'Las Palmas': [28.1235, -15.4366],
  'Bizkaia': [43.2630, -2.9350],
  'Alicante': [38.3452, -0.4810],
  'Córdoba': [37.8882, -4.7794],
  'Valladolid': [41.6523, -4.7245],
  'Pontevedra': [42.4330, -8.6483],
  'Asturias': [43.3614, -5.8593],
  'A Coruña': [43.3623, -8.4115],
  'Álava': [42.8467, -2.6726],
  'Granada': [37.1773, -3.5986],
  'Navarra': [42.8188, -1.6444],
  'Almería': [36.8381, -2.4597],
  'Burgos': [42.3440, -3.6969],
  'Castellón': [39.9864, -0.0513],
  'Salamanca': [40.9701, -5.6635],
  'Huelva': [37.2614, -6.9447],
  'Jaén': [37.7796, -3.7849],
  'Badajoz': [38.8794, -6.9707],
  'Lleida': [41.6176, 0.6200],
  'Tarragona': [41.1189, 1.2445],
  'La Rioja': [42.4650, -2.4456],
  'Cáceres': [39.4753, -6.3724],
  'Toledo': [39.8628, -4.0273],
  'Ciudad Real': [38.9848, -3.9274],
  'Cuenca': [40.0704, -2.1374],
  'Guadalajara': [40.6321, -3.1660],
  'Albacete': [38.9942, -1.8564],
  'Cádiz': [36.5297, -6.2927],
  'Cantabria': [43.4623, -3.8099],
  'Gipuzkoa': [43.3183, -1.9812],
  'Girona': [41.9794, 2.8214],
  'Lugo': [43.0097, -7.5567],
  'Ourense': [42.3358, -7.8639],
  'Palencia': [42.0096, -4.5288],
  'Zamora': [41.5034, -5.7454],
  'Ávila': [40.6566, -4.6814],
  'Segovia': [40.9429, -4.1088],
  'Soria': [41.7640, -2.4641],
  'Teruel': [40.3456, -1.1065],
  'Huesca': [42.1401, -0.4089],
  'Santa Cruz de Tenerife': [28.4682, -16.2546],
  'Ceuta': [35.8894, -5.3213],
  'Melilla': [35.2923, -2.9381],
}

function findCoords(nombre: string): [number, number] | null {
  if (REGION_COORDS[nombre]) return REGION_COORDS[nombre]
  // Búsqueda por substring (ej: "Área Metropolitana de Madrid" → Madrid)
  const entry = Object.entries(REGION_COORDS).find(([key]) =>
    nombre.toLowerCase().includes(key.toLowerCase()) ||
    key.toLowerCase().includes(nombre.toLowerCase())
  )
  return entry ? entry[1] : null
}

export default function Mapa() {
  const { data: response, isLoading } = useDatasets()
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)

  const datasets: ConjuntoDatos[] = response?.conjuntosDatoDto ?? []

  // Agrupar datasets por región
  const regionGroups = useMemo(() => {
    const acc: Record<string, { count: number; datasets: string[] }> = {}
    for (const ds of datasets) {
      for (const reg of ds.regiones ?? []) {
        const key = reg.nombre
        if (!acc[key]) acc[key] = { count: 0, datasets: [] }
        acc[key].count++
        if (acc[key].datasets.length < 5) acc[key].datasets.push(ds.nombre)
      }
    }
    return acc
  }, [datasets])

  const markers = useMemo(() =>
    Object.entries(regionGroups)
      .map(([name, data]) => {
        const coords = findCoords(name)
        if (!coords) return null
        return { name, coords, ...data }
      })
      .filter(Boolean) as { name: string; coords: [number, number]; count: number; datasets: string[] }[],
    [regionGroups]
  )

  const maxCount = Math.max(...markers.map((m) => m.count), 1)

  return (
    <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
      <Header
        title="Mapa de cobertura"
        subtitle="Distribución de datasets por región de España"
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Panel lateral — regiones ordenadas por cobertura */}
        <div className="w-64 bg-white border-r border-slate-200 overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Regiones con datos ({Object.keys(regionGroups).length})
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {Object.entries(regionGroups)
              .sort((a, b) => b[1].count - a[1].count)
              .map(([name, data]) => (
                <button
                  key={name}
                  onClick={() => setSelectedRegion(name === selectedRegion ? null : name)}
                  className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors ${
                    selectedRegion === name ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-700 truncate">{name}</span>
                    <span className="text-xs font-bold text-blue-600 ml-2 flex-shrink-0">{data.count}</span>
                  </div>
                </button>
              ))}
          </div>
        </div>

        {/* Mapa */}
        <div className="flex-1 relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Cargando mapa...</span>
              </div>
            </div>
          ) : (
            <MapContainer
              center={[40.416775, -3.703790]}
              zoom={6}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {markers.map((m) => {
                const radius = 7 + (m.count / maxCount) * 18
                const isSelected = selectedRegion === m.name
                return (
                  <CircleMarker
                    key={m.name}
                    center={m.coords}
                    radius={radius}
                    pathOptions={{
                      color: isSelected ? '#1d4ed8' : '#2563eb',
                      fillColor: isSelected ? '#1d4ed8' : '#3b82f6',
                      fillOpacity: isSelected ? 0.9 : 0.55,
                      weight: isSelected ? 2 : 1,
                    }}
                    eventHandlers={{
                      click: () => setSelectedRegion(m.name === selectedRegion ? null : m.name),
                    }}
                  >
                    <Popup>
                      <div className="text-sm min-w-36">
                        <p className="font-bold text-slate-800 mb-1">{m.name}</p>
                        <p className="text-blue-600 font-semibold">{m.count} datasets</p>
                        {m.datasets.length > 0 && (
                          <ul className="mt-2 space-y-0.5 text-xs text-slate-500">
                            {m.datasets.map((d, i) => (
                              <li key={i} className="truncate max-w-52">· {d}</li>
                            ))}
                            {m.count > 5 && (
                              <li className="text-slate-400">...y {m.count - 5} más</li>
                            )}
                          </ul>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                )
              })}
            </MapContainer>
          )}
        </div>
      </div>
    </div>
  )
}
