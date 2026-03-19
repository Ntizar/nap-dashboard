import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Resumen', icon: '▦' },
  { to: '/datasets', label: 'Datasets', icon: '⊞' },
  { to: '/operadores', label: 'Operadores', icon: '◎' },
  { to: '/mapa', label: 'Mapa', icon: '⊕' },
]

export function Sidebar() {
  return (
    <aside className="w-56 min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-slate-700">
        <p className="text-xs text-slate-400 uppercase tracking-widest">Ministerio de Transportes</p>
        <h1 className="mt-1 text-lg font-bold leading-tight">NAP Dashboard</h1>
        <p className="text-xs text-slate-500 mt-0.5">España</p>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <span className="text-base">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-700">
        <p className="text-xs text-slate-500">
          Datos:{' '}
          <a
            href="https://nap.transportes.gob.es"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            nap.transportes.gob.es
          </a>
        </p>
      </div>
    </aside>
  )
}
