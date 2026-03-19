import { useState, useMemo } from 'react'
import { useOperators } from '../hooks/useNap'
import { Header } from '../components/layout/Header'
import { TableSkeleton } from '../components/cards/Skeleton'

interface OperadoresProps { onMenuToggle?: () => void }

export default function Operadores({ onMenuToggle }: OperadoresProps) {
  const { data: operators, isLoading, isError } = useOperators()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 30

  const filtered = useMemo(() =>
    (operators ?? []).filter((op) =>
      !search || op.nombre.toLowerCase().includes(search.toLowerCase())
    ),
    [operators, search]
  )

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  if (isError) {
    return (
      <div className="flex-1 bg-slate-50">
        <Header title="Operadores" onMenuToggle={onMenuToggle} />
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-700 text-sm">
            Error cargando operadores.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-slate-50 overflow-auto">
      <Header
        title="Operadores de Transporte"
        subtitle={`${filtered.length} operadores registrados en el catálogo NAP`}
        onMenuToggle={onMenuToggle}
      />

      <div className="p-6 space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <input
            type="text"
            placeholder="Buscar operador por nombre..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {isLoading ? (
          <TableSkeleton rows={12} />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Operador</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">URL</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Datasets asociados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginated.map((op) => (
                    <tr key={op.operadorId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">{op.nombre}</td>
                      <td className="px-4 py-3">
                        {op.url ? (
                          <a
                            href={op.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-xs truncate block max-w-48"
                          >
                            {op.url}
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {(op.conjuntosDatos?.length ?? 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                            {op.conjuntosDatos!.length} dataset{op.conjuntosDatos!.length > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center text-slate-400">
                        No hay operadores que coincidan con la búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
                <span>
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
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
