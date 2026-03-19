import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { useDatasets, useTransportTypes, useOrganizations, useRegions } from '../hooks/useNap'
import { Header } from '../components/layout/Header'
import { KpiCard } from '../components/cards/KpiCard'
import { KpiSkeleton, ChartSkeleton } from '../components/cards/Skeleton'
import { HorizontalBarChart } from '../components/charts/HorizontalBarChart'
import { DonutChart } from '../components/charts/DonutChart'
import type { ConjuntoDatos } from '../lib/types'

function countByTransport(datasets: ConjuntoDatos[]) {
  const acc: Record<string, number> = {}
  for (const ds of datasets) {
    for (const t of ds.tiposTransporte ?? []) {
      acc[t.nombre] = (acc[t.nombre] ?? 0) + 1
    }
  }
  return Object.entries(acc)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

function countByOrg(datasets: ConjuntoDatos[]) {
  const acc: Record<string, number> = {}
  for (const ds of datasets) {
    const key = ds.organizacion?.nombre ?? 'Sin organización'
    acc[key] = (acc[key] ?? 0) + 1
  }
  return Object.entries(acc).map(([name, value]) => ({ name, value }))
}

function countByFormat(datasets: ConjuntoDatos[]) {
  const formats = ['GTFS', 'NeTEx', 'DATEX II', 'SIRI']
  const acc: Record<string, number> = {}
  for (const ds of datasets) {
    for (const f of ds.ficherosDto ?? []) {
      const upper = f.tipoFicheroNombre?.toUpperCase() ?? ''
      const matched = formats.find(fmt => upper.includes(fmt))
      const key = matched ?? 'Otros'
      acc[key] = (acc[key] ?? 0) + 1
    }
  }
  return Object.entries(acc)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

function buildActivityChart(datasets: ConjuntoDatos[]) {
  const acc: Record<string, number> = {}
  const now = new Date()
  // Pre-fill last 12 months
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    acc[key] = 0
  }
  for (const ds of datasets) {
    for (const f of ds.ficherosDto ?? []) {
      if (!f.fechaActualizacion) continue
      try {
        // Accept both ISO (2024-03-15T...) and DD/MM/YYYY formats
        let date: Date
        const raw = f.fechaActualizacion.trim()
        if (raw.includes('/')) {
          const [d, m, y] = raw.split('/')
          date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
        } else {
          date = new Date(raw)
        }
        if (isNaN(date.getTime())) continue
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        if (key in acc) acc[key] = (acc[key] ?? 0) + 1
      } catch {
        // ignore malformed dates
      }
    }
  }
  return Object.entries(acc).map(([month, updates]) => ({
    month: month.replace(/^(\d{4})-(\d{2})$/, (_, y, m) => {
      const names = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
      return `${names[parseInt(m) - 1]} ${y.slice(2)}`
    }),
    updates,
  }))
}

function top5Datasets(datasets: ConjuntoDatos[]) {
  return [...datasets]
    .map(ds => ({
      ds,
      rutas: ds.ficherosDto?.reduce((s, f) => s + (f.numeroRutas ?? 0), 0) ?? 0,
      paradas: ds.ficherosDto?.reduce((s, f) => s + (f.numeroParadas ?? 0), 0) ?? 0,
      viajes: ds.ficherosDto?.reduce((s, f) => s + (f.numeroViajes ?? 0), 0) ?? 0,
    }))
    .filter(x => x.rutas > 0 || x.paradas > 0 || x.viajes > 0)
    .sort((a, b) => b.rutas - a.rutas || b.paradas - a.paradas)
    .slice(0, 5)
}

// Transport type icons map
const TRANSPORT_ICONS: Record<string, string> = {
  bus: '🚌', tren: '🚆', metro: '🚇', tranvía: '🚋', ferry: '⛴️',
  autocar: '🚌', bicicleta: '🚲', taxi: '🚕', aéreo: '✈️', cable: '🚡',
}

function transportIcon(name: string): string {
  const lower = name.toLowerCase()
  for (const [key, icon] of Object.entries(TRANSPORT_ICONS)) {
    if (lower.includes(key)) return icon
  }
  return '🚐'
}

interface OverviewProps { onMenuToggle?: () => void }

export default function Overview({ onMenuToggle }: OverviewProps) {
  const navigate = useNavigate()
  const { data: response, isLoading: loadingDs, isError: errorDs } = useDatasets()
  const { data: transportTypes, isLoading: loadingTT } = useTransportTypes()
  const { data: organizations, isLoading: loadingOrg } = useOrganizations()
  const { data: regions, isLoading: loadingReg } = useRegions()

  const datasets = response?.conjuntosDatoDto ?? []

  const byTransport = useMemo(() => countByTransport(datasets), [datasets])
  const byOrg = useMemo(() => countByOrg(datasets), [datasets])
  const byFormat = useMemo(() => countByFormat(datasets), [datasets])
  const activityData = useMemo(() => buildActivityChart(datasets), [datasets])
  const topDatasets = useMemo(() => top5Datasets(datasets), [datasets])

  const totalDatasets = response?.filesNum ?? datasets.length
  const totalOrgs = organizations?.length ?? 0
  const totalRegions = regions?.length ?? 0
  const totalTransportTypes = transportTypes?.length ?? 0

  const totalFicheros = datasets.reduce((s, ds) => s + (ds.ficherosDto?.length ?? 0), 0)
  const totalValidados = datasets.filter(ds => ds.ficherosDto?.some(f => f.validado)).length
  const totalAlertas = datasets.filter(ds => ds.ficherosDto?.some(f => Array.isArray(f.avisos) && ((f.avisos as unknown[] | undefined)?.length ?? 0) > 0)).length

  const isLoading = loadingDs || loadingTT || loadingOrg || loadingReg

  if (errorDs) {
    return (
      <div className="flex-1 bg-slate-50">
        <Header title="Resumen" subtitle="Vista general del catálogo de transporte de España" onMenuToggle={onMenuToggle} />
        <div className="p-4 md:p-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-700 text-sm">
            Error cargando datos. Verifica que la variable de entorno <code>NAP_API_KEY</code> está configurada.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto" style={{ background: 'var(--nap-bg)' }}>
      <Header
        title="Resumen"
        subtitle="Vista general del catálogo de transporte de España"
        onMenuToggle={onMenuToggle}
      />

      <div className="p-4 md:p-6 space-y-5">

        {/* KPIs fila 1 — principales */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
          ) : (
            <>
              <KpiCard
                label="Total Datasets"
                value={totalDatasets}
                description="Conjuntos de datos publicados en el NAP"
                color="blue"
                icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>}
              />
              <KpiCard
                label="Organizaciones"
                value={totalOrgs}
                description="Entidades publicadoras de datos"
                color="orange"
                icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
              />
              <KpiCard
                label="Tipos de transporte"
                value={totalTransportTypes}
                description="Modos: bus, tren, metro, ferry..."
                color="yellow"
                icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>}
              />
              <KpiCard
                label="Regiones"
                value={totalRegions}
                description="Provincias, CCAA y áreas cubiertas"
                color="teal"
                icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>}
              />
            </>
          )}
        </div>

        {/* KPIs fila 2 — secundarios */}
        {!isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a56a0" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <div className="min-w-0">
                <p className="text-xl md:text-2xl font-bold text-slate-800">{totalFicheros.toLocaleString('es-ES')}</p>
                <p className="text-xs text-slate-500 truncate">Ficheros totales</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div className="min-w-0">
                <p className="text-xl md:text-2xl font-bold text-slate-800">{totalValidados.toLocaleString('es-ES')}</p>
                <p className="text-xs text-slate-500 truncate">Datasets validados</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div className="min-w-0">
                <p className="text-xl md:text-2xl font-bold text-slate-800">{totalAlertas.toLocaleString('es-ES')}</p>
                <p className="text-xs text-slate-500 truncate">Con alertas</p>
              </div>
            </div>
          </div>
        )}

        {/* Actividad reciente — AreaChart */}
        {!loadingDs && activityData.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Actividad reciente</h3>
            <p className="text-xs text-slate-400 mb-4">Ficheros actualizados por mes (últimos 12 meses)</p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={activityData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUpdates" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a56a0" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#1a56a0" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  formatter={(v) => [v ?? 0, 'Actualizaciones']}
                />
                <Area type="monotone" dataKey="updates" stroke="#1a56a0" strokeWidth={2} fill="url(#colorUpdates)" dot={false} activeDot={{ r: 4, fill: '#1a56a0' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Gráficos fila 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loadingDs ? (
            <>
              <ChartSkeleton />
              <ChartSkeleton />
            </>
          ) : (
            <>
              <HorizontalBarChart
                data={byTransport}
                title="Datasets por tipo de transporte"
              />
              <HorizontalBarChart
                data={byOrg}
                title="Top 10 organizaciones"
                maxItems={10}
              />
            </>
          )}
        </div>

        {/* Gráficos fila 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loadingDs ? (
            <>
              <ChartSkeleton />
              <ChartSkeleton />
            </>
          ) : (
            <>
              <DonutChart
                data={byOrg}
                title="Distribución por organización (top 7)"
              />
              <HorizontalBarChart
                data={byFormat}
                title="Ficheros por formato"
              />
            </>
          )}
        </div>

        {/* Top 5 datasets más ricos */}
        {!loadingDs && topDatasets.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-700">Top 5 datasets más completos</h3>
                <p className="text-xs text-slate-400 mt-0.5">Ordenados por número de rutas</p>
              </div>
              <button
                onClick={() => navigate('/gtfs')}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Abrir GTFS Viewer →
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-xs font-medium text-slate-400 pb-2 pr-3">Dataset</th>
                    <th className="text-left text-xs font-medium text-slate-400 pb-2 pr-3 hidden sm:table-cell">Organización</th>
                    <th className="text-left text-xs font-medium text-slate-400 pb-2 pr-3 hidden md:table-cell">Transporte</th>
                    <th className="text-right text-xs font-medium text-slate-400 pb-2 pr-3">Rutas</th>
                    <th className="text-right text-xs font-medium text-slate-400 pb-2 pr-3 hidden sm:table-cell">Paradas</th>
                    <th className="text-right text-xs font-medium text-slate-400 pb-2">Viajes</th>
                  </tr>
                </thead>
                <tbody>
                  {topDatasets.map(({ ds, rutas, paradas, viajes }) => (
                    <tr key={ds.conjuntoDatoId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 pr-3">
                        <p className="font-medium text-slate-800 text-xs leading-tight line-clamp-2">{ds.nombre}</p>
                      </td>
                      <td className="py-2.5 pr-3 hidden sm:table-cell">
                        <p className="text-xs text-slate-500 truncate max-w-[160px]">{ds.organizacion?.nombre ?? '—'}</p>
                      </td>
                      <td className="py-2.5 pr-3 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {(ds.tiposTransporte ?? []).slice(0, 2).map(t => (
                            <span key={t.tipoTransporteId} className="inline-flex items-center gap-0.5 text-xs bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">
                              {transportIcon(t.nombre)} {t.nombre}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        <span className="text-sm font-semibold text-blue-700">{rutas > 0 ? rutas.toLocaleString('es-ES') : '—'}</span>
                      </td>
                      <td className="py-2.5 pr-3 text-right hidden sm:table-cell">
                        <span className="text-xs text-slate-600">{paradas > 0 ? paradas.toLocaleString('es-ES') : '—'}</span>
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="text-xs text-slate-600">{viajes > 0 ? viajes.toLocaleString('es-ES') : '—'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
