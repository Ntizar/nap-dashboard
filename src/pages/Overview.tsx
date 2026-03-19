import { useDatasets, useTransportTypes, useOrganizations, useRegions } from '../hooks/useNap'
import { Header } from '../components/layout/Header'
import { KpiCard } from '../components/cards/KpiCard'
import { KpiSkeleton, ChartSkeleton } from '../components/cards/Skeleton'
import { HorizontalBarChart } from '../components/charts/HorizontalBarChart'
import { DonutChart } from '../components/charts/DonutChart'

// Helpers para derivar métricas del array plano que devuelve la API
function countByField(datasets: Record<string, unknown>[], field: string): { name: string; value: number }[] {
  const acc: Record<string, number> = {}
  for (const ds of datasets) {
    const items = ds[field] as { nombre?: string; id?: number }[] | undefined
    if (!items) continue
    for (const item of items) {
      const key = item.nombre ?? String(item.id ?? '?')
      acc[key] = (acc[key] ?? 0) + 1
    }
  }
  return Object.entries(acc).map(([name, value]) => ({ name, value }))
}

function countByOrg(datasets: Record<string, unknown>[]): { name: string; value: number }[] {
  const acc: Record<string, number> = {}
  for (const ds of datasets) {
    const org = ds['organizacion'] as { nombre?: string } | undefined
    const key = org?.nombre ?? 'Sin organización'
    acc[key] = (acc[key] ?? 0) + 1
  }
  return Object.entries(acc).map(([name, value]) => ({ name, value }))
}

export default function Overview() {
  const { data: datasets, isLoading: loadingDs, isError: errorDs } = useDatasets()
  const { data: transportTypes, isLoading: loadingTT } = useTransportTypes()
  const { data: organizations, isLoading: loadingOrg } = useOrganizations()
  const { data: regions, isLoading: loadingReg } = useRegions()

  const ds = (datasets ?? []) as Record<string, unknown>[]

  const byTransport = countByField(ds, 'tiposTransporte')
  const byOrg = countByOrg(ds)

  // Métricas simples derivadas de los catálogos
  const totalDatasets = ds.length
  const totalOperators = ds.reduce((s, d) => {
    const ops = d['operadores'] as unknown[] | undefined
    return s + (ops?.length ?? 0)
  }, 0)
  const totalOrgs = (organizations as unknown[] | undefined)?.length ?? 0
  const totalRegions = (regions as unknown[] | undefined)?.length ?? 0
  const totalTransportTypes = (transportTypes as unknown[] | undefined)?.length ?? 0

  if (errorDs) {
    return (
      <div className="flex-1 bg-slate-50">
        <Header title="Resumen" subtitle="Vista general del catálogo de transporte de España" />
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-700 text-sm">
            Error cargando datos. Verifica que la variable de entorno NAP_API_KEY está configurada en Vercel.
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
          {loadingDs || loadingTT || loadingOrg || loadingReg ? (
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
                maxItems={10}
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
                data={byOrg.slice(0, 10)}
                title="Distribución por organización (top 7)"
              />
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Operadores en datasets</h3>
                <p className="text-5xl font-bold text-blue-700">{totalOperators}</p>
                <p className="text-sm text-slate-500 mt-2">
                  Operadores de transporte referenciados en el catálogo
                </p>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-400">
                    Ve a la sección <strong>Operadores</strong> para ver el listado completo.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
