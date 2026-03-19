import { useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { useDatasets } from '../hooks/useNap'
import { Header } from '../components/layout/Header'
import 'leaflet/dist/leaflet.css'

// Coordenadas aproximadas por nombre de provincia/CCAA para posicionar pins
// Solo un subconjunto representativo — si la API devuelve coords, se usan esas
const REGION_COORDS: Record<string, [number, number]> = {
  'Madrid': [40.4168, -3.7038],
  'Barcelona': [41.3851, 2.1734],
  'Valencia': [39.4699, -0.3763],
  'Sevilla': [37.3891, -5.9845],
  'Zaragoza': [41.6488, -0.8891],
  'Málaga': [36.7213, -4.4213],
  'Murcia': [37.9922, -1.1307],
  'Palma': [39.5696, 2.6502],
  'Las Palmas': [28.1235, -15.4366],
  'Bilbao': [43.2630, -2.9350],
  'Alicante': [38.3452, -0.4810],
  'Córdoba': [37.8882, -4.7794],
  'Valladolid': [41.6523, -4.7245],
  'Vigo': [42.2314, -8.7124],
  'Gijón': [43.5453, -5.6627],
  'A Coruña': [43.3623, -8.4115],
  'Vitoria-Gasteiz': [42.8467, -2.6726],
  'Granada': [37.1773, -3.5986],
  'Elche': [38.2669, -0.6983],
  'Oviedo': [43.3614, -5.8593],
  'Badalona': [41.4501, 2.2474],
  'Santa Cruz de Tenerife': [28.4682, -16.2546],
  'Pamplona': [42.8188, -1.6444],
  'Almería': [36.8381, -2.4597],
  'Burgos': [42.3440, -3.6969],
  'Castellón': [39.9864, -0.0513],
  'Salamanca': [40.9701, -5.6635],
  'Huelva': [37.2614, -6.9447],
  'Jaén': [37.7796, -3.7849],
  'Badajoz': [38.8794, -6.9707],
  'Lleida': [41.6176, 0.6200],
  'Tarragona': [41.1189, 1.2445],
  'Logroño': [42.4650, -2.4456],
  'Cáceres': [39.4753, -6.3724],
  'Toledo': [39.8628, -4.0273],
  'Ciudad Real': [38.9848, -3.9274],
  'Cuenca': [40.0704, -2.1374],
  'Guadalajara': [40.6321, -3.1660],
  'Albacete': [38.9942, -1.8564],
  'Mérida': [38.9154, -6.3492],
  'Cádiz': [36.5297, -6.2927],
  'Santander': [43.4623, -3.8099],
  'San Sebastián': [43.3183, -1.9812],
  'Girona': [41.9794, 2.8214],
  'Pontevedra': [42.4330, -8.6483],
  'Lugo': [43.0097, -7.5567],
  'Ourense': [42.3358, -7.8639],
  'Palencia': [42.0096, -4.5288],
  'Zamora': [41.5034, -5.7454],
  'Ávila': [40.6566, -4.6814],
  'Segovia': [40.9429, -4.1088],
  'Soria': [41.7640, -2.4641],
  'Teruel': [40.3456, -1.1065],
  'Huesca': [42.1401, -0.4089],
  'Ceuta': [35.8894, -5.3213],
  'Melilla': [35.2923, -2.9381],
}

type Dataset = Record<string, unknown>

export default function Mapa() {
  const { data: raw, isLoading } = useDatasets()
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)

  const datasets = (raw ?? []) as Dataset[]

  // Agrupar datasets por región (nombre de la primera región disponible)
  const regionGroups = useMemo(() => {
    const acc: Record<string, { count: number; datasets: string[] }> = {}
    for (const ds of datasets) {
      const regs = (ds['regiones'] as { nombre?: string }[] | undefined) ?? []
      for (const reg of regs) {
        const key = reg.nombre ?? 'Desconocida'
        if (!acc[key]) acc[key] = { count: 0, datasets: [] }
        acc[key].count++
        if (acc[key].datasets.length < 5) {
          acc[key].datasets.push(String(ds['nombre'] ?? ''))
        }
      }
    }
    return acc
  }, [datasets])

  const markers = useMemo(() => {
    return Object.entries(regionGroups)
      .map(([name, data]) => {
        // Buscar coords exactas o por substring
        const coords =
          REGION_COORDS[name] ??
          Object.entries(REGION_COORDS).find(([k]) =>
            name.toLowerCase().includes(k.toLowerCase()) ||
            k.toLowerCase().includes(name.toLowerCase())
          )?.[1]
        if (!coords) return null
        return { name, coords, ...data }
      })
      .filter(Boolean) as { name: string; coords: [number, number]; count: number; datasets: string[] }[]
  }, [regionGroups])

  const maxCount = Math.max(...markers.map((m) => m.count), 1)

  return (
    <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
      <Header
        title="Mapa de cobertura"
        subtitle="Datasets por provincia y área de España"
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Panel lateral */}
        <div className="w-72 bg-white border-r border-slate-200 overflow-y-auto">
          <div className="p-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Regiones ({Object.keys(regionGroups).length})
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {Object.entries(regionGroups)
              .sort((a, b) => b[1].count - a[1].count)
              .slice(0, 50)
              .map(([name, data]) => (
                <button
                  key={name}
                  onClick={() => setSelectedRegion(name === selectedRegion ? null : name)}
                  className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors ${
                    selectedRegion === name ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-700 font-medium truncate">{name}</span>
                    <span className="text-xs text-blue-600 font-bold ml-2">{data.count}</span>
                  </div>
                </button>
              ))}
          </div>
        </div>

        {/* Mapa */}
        <div className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              Cargando mapa...
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
                const radius = 6 + (m.count / maxCount) * 20
                const isSelected = selectedRegion === m.name
                return (
                  <CircleMarker
                    key={m.name}
                    center={m.coords}
                    radius={radius}
                    pathOptions={{
                      color: isSelected ? '#1d4ed8' : '#2563eb',
                      fillColor: isSelected ? '#1d4ed8' : '#3b82f6',
                      fillOpacity: isSelected ? 0.9 : 0.6,
                      weight: isSelected ? 2 : 1,
                    }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-bold text-slate-800">{m.name}</p>
                        <p className="text-blue-600">{m.count} datasets</p>
                        {m.datasets.length > 0 && (
                          <ul className="mt-2 space-y-0.5">
                            {m.datasets.map((d, i) => (
                              <li key={i} className="text-xs text-slate-500 truncate max-w-48">
                                · {d}
                              </li>
                            ))}
                            {m.count > 5 && (
                              <li className="text-xs text-slate-400">...y {m.count - 5} más</li>
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
