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
  return Object.entries(acc).map(([name, value]) => ({ name, value }))
}

function countByOrg(datasets: ConjuntoDatos[]) {
  const acc: Record<string, number> = {}
  for (const ds of datasets) {
    const key = ds.organizacion?.nombre ?? 'Sin organización'
    acc[key] = (acc[key] ?? 0) + 1
  }
  return Object.entries(acc).map(([name, value]) => ({ name, value }))
}

export default function Overview() {
  const { data: response, isLoading: loadingDs, isError: errorDs } = useDatasets()
  const { data: transportTypes, isLoading: loadingTT } = useTransportTypes()
  const { data: organizations, isLoading: loadingOrg } = useOrganizations()
  const { data: regions, isLoading: loadingReg } = useRegions()

  const datasets = response?.conjuntosDatoDto ?? []

  const byTransport = countByTransport(datasets)
  const byOrg = countByOrg(datasets)

  const totalDatasets = response?.filesNum ?? datasets.length
  const totalOrgs = organizations?.length ?? 0
  const totalRegions = regions?.length ?? 0
  const totalTransportTypes = transportTypes?.length ?? 0

  const isLoading = loadingDs || loadingTT || loadingOrg || loadingReg

  if (errorDs) {
    return (
      <div className="flex-1 bg-slate-50">
        <Header title="Resumen" subtitle="Vista general del catálogo de transporte de España" />
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-700 text-sm">
            Error cargando datos. Verifica que la variable de entorno <code>NAP_API_KEY</code> está configurada.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-slate-50 overflow-auto">
      <Header
        title="Resumen"
        subtitle="Vista general del catálogo de transporte de España"
      />

      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
          ) : (
            <>
              <KpiCard
                label="Total Datasets"
                value={totalDatasets}
                description="Conjuntos de datos publicados"
                color="blue"
              />
              <KpiCard
                label="Organizaciones"
                value={totalOrgs}
                description="Entidades publicadoras"
                color="green"
              />
              <KpiCard
                label="Tipos de transporte"
                value={totalTransportTypes}
                description="Modos de transporte cubiertos"
                color="amber"
              />
              <KpiCard
                label="Regiones"
                value={totalRegions}
                description="Provincias, CCAA y áreas"
                color="purple"
              />
            </>
          )}
        </div>

        {/* Gráficos fila 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                title="Top 10 organizaciones por número de datasets"
                maxItems={10}
              />
            </>
          )}
        </div>

        {/* Gráfico fila 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {loadingDs ? (
            <>
              <ChartSkeleton />
              <div />
            </>
          ) : (
            <>
              <DonutChart
                data={byOrg}
                title="Distribución por organización (top 7)"
              />
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Ficheros en el catálogo</h3>
                <p className="text-5xl font-bold text-blue-700">
                  {datasets.reduce((s, ds) => s + (ds.ficherosDto?.length ?? 0), 0)}
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  Total de ficheros descargables (GTFS, NeTEx, etc.)
                </p>
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-1">
                  {['GTFS', 'NeTEx', 'DATEX II', 'SIRI'].map((fmt) => {
                    const count = datasets.reduce((s, ds) =>
                      s + (ds.ficherosDto?.filter(f => f.tipoFicheroNombre?.toUpperCase().includes(fmt)).length ?? 0), 0)
                    return count > 0 ? (
                      <div key={fmt} className="flex justify-between text-xs text-slate-500">
                        <span>{fmt}</span>
                        <span className="font-semibold text-slate-700">{count}</span>
                      </div>
                    ) : null
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
