import { useState, useMemo } from 'react'
import { useDatasets, useTransportTypes, useOrganizations } from '../hooks/useNap'
import { Header } from '../components/layout/Header'
import { TableSkeleton } from '../components/cards/Skeleton'

type Dataset = Record<string, unknown>

function badge(text: string, color = 'blue') {
  const classes: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-emerald-100 text-emerald-700',
    slate: 'bg-slate-100 text-slate-600',
  }
  return (
    <span
      key={text}
      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${classes[color] ?? classes.slate}`}
    >
      {text}
    </span>
  )
}

export default function Datasets() {
  const { data: raw, isLoading, isError } = useDatasets()
  const { data: transportTypes } = useTransportTypes()
  const { data: organizations } = useOrganizations()

  const [search, setSearch] = useState('')
  const [filterTransport, setFilterTransport] = useState<string>('')
  const [filterOrg, setFilterOrg] = useState<string>('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 25

  const datasets = (raw ?? []) as Dataset[]
  const tTypes = (transportTypes ?? []) as { id: number; nombre: string }[]
  const orgs = (organizations ?? []) as { id: number; nombre: string }[]

  const filtered = useMemo(() => {
    return datasets.filter((ds) => {
      const nombre = String(ds['nombre'] ?? '').toLowerCase()
      const desc = String(ds['descripcion'] ?? '').toLowerCase()
      const org = (ds['organizacion'] as { nombre?: string } | undefined)?.nombre ?? ''
      const tipos = (ds['tiposTransporte'] as { nombre?: string }[] | undefined) ?? []

      const matchSearch =
        !search ||
        nombre.includes(search.toLowerCase()) ||
        desc.includes(search.toLowerCase()) ||
        org.toLowerCase().includes(search.toLowerCase())

      const matchTransport =
        !filterTransport || tipos.some((t) => t.nombre === filterTransport)

      const matchOrg = !filterOrg || org === filterOrg

      return matchSearch && matchTransport && matchOrg
    })
  }, [datasets, search, filterTransport, filterOrg])

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  if (isError) {
    return (
      <div className="flex-1 bg-slate-50">
        <Header title="Datasets" subtitle="Catálogo de conjuntos de datos de transporte" />
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-700 text-sm">
            Error cargando datos.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-slate-50 overflow-auto">
      <Header
        title="Datasets"
        subtitle={`${filtered.length} conjuntos de datos${filtered.length !== datasets.length ? ` (filtrado de ${datasets.length})` : ''}`}
      />

      <div className="p-6 space-y-4">
        {/* Filtros */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Buscar por nombre, descripción u organización..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            className="flex-1 min-w-52 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterTransport}
            onChange={(e) => { setFilterTransport(e.target.value); setPage(0) }}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los transportes</option>
            {tTypes.map((t) => (
              <option key={t.id} value={t.nombre}>{t.nombre}</option>
            ))}
          </select>
          <select
            value={filterOrg}
            onChange={(e) => { setFilterOrg(e.target.value); setPage(0) }}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las organizaciones</option>
            {orgs.slice(0, 100).map((o) => (
              <option key={o.id} value={o.nombre}>{o.nombre}</option>
            ))}
          </select>
          {(search || filterTransport || filterOrg) && (
            <button
              onClick={() => { setSearch(''); setFilterTransport(''); setFilterOrg(''); setPage(0) }}
              className="text-sm text-slate-500 hover:text-red-600 underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Tabla */}
        {isLoading ? (
          <TableSkeleton rows={10} />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 w-1/3">Nombre</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Organización</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Transporte</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Ficheros</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Actualización</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginated.map((ds, i) => {
                    const ficheros = (ds['ficheros'] as { id: number; nombre?: string; url?: string }[] | undefined) ?? []
                    const tipos = (ds['tiposTransporte'] as { nombre?: string }[] | undefined) ?? []
                    const org = (ds['organizacion'] as { nombre?: string } | undefined)?.nombre ?? '—'
                    const fecha = ds['fechaActualizacion']
                      ? new Date(String(ds['fechaActualizacion'])).toLocaleDateString('es-ES')
                      : '—'
                    const firstFichero = ficheros[0]
                    const dsNombre = String(ds['nombre'] ?? '—')
                    const dsDesc = ds['descripcion'] ? String(ds['descripcion']) : null

                    return (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800 line-clamp-2">{dsNombre}</p>
                          {dsDesc && (
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{dsDesc}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{org}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {tipos.slice(0, 3).map((t) => badge(t.nombre ?? '?', 'blue'))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{ficheros.length}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{fecha}</td>
                        <td className="px-4 py-3">
                          {firstFichero?.url && (
                            <a
                              href={firstFichero.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium underline"
                            >
                              Descargar
                            </a>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                        No hay resultados para los filtros aplicados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
                <span>
                  Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
