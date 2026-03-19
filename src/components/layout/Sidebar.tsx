import { NavLink } from 'react-router-dom'
import { useApiKey } from '../../context/ApiKeyContext'

const links = [
  { to: '/', label: 'Resumen', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  )},
  { to: '/datasets', label: 'Datasets', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    </svg>
  )},
  { to: '/operadores', label: 'Operadores', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )},
  { to: '/mapa', label: 'Mapa', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
      <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
    </svg>
  )},
  { to: '/gtfs', label: 'GTFS Viewer', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  )},
]

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ open = true, onClose }: SidebarProps) {
  const { clearApiKey } = useApiKey()

  const sidebarContent = (
    <aside className="w-56 h-full bg-white text-slate-700 flex flex-col border-r border-slate-200 shadow-sm">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1a56a0, #0f3460)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 leading-tight">NAP Dashboard</h1>
            <p className="text-[10px] text-slate-400 leading-tight">Transportes España</p>
          </div>
        </div>
        {/* Close button — only visible on mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Cerrar menú"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`
            }
            style={({ isActive }) => isActive ? { background: 'linear-gradient(135deg, #1a56a0, #2b6cb0)' } : {}}
          >
            <span className="flex-shrink-0 opacity-80">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-100 space-y-2">
        <p className="text-[10px] text-slate-400">
          Datos:{' '}
          <a
            href="https://nap.transportes.gob.es"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
            style={{ color: 'var(--nap-blue)' }}
          >
            nap.transportes.gob.es
          </a>
        </p>
        <button
          onClick={clearApiKey}
          className="text-[10px] text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Cambiar API key
        </button>

        {/* Aviso legal */}
        <div className="pt-1 border-t border-slate-100 space-y-1">
          <p className="text-[9px] text-slate-300 leading-tight">
            Visualizador no oficial. Los datos pertenecen al{' '}
            <a href="https://www.transportes.gob.es" target="_blank" rel="noopener noreferrer" className="hover:underline text-slate-400">
              Ministerio de Transportes y Movilidad Sostenible
            </a>
            {' '}y se publican bajo la{' '}
            <a href="https://nap.transportes.gob.es/licencia-datos" target="_blank" rel="noopener noreferrer" className="hover:underline text-slate-400">
              Licencia de Datos Abiertos MITRAMS
            </a>
            . Esta herramienta no está afiliada ni respaldada por el MITRAMS.
            El uso de los datos es responsabilidad exclusiva del usuario. Consulta las{' '}
            <a href="https://nap.transportes.gob.es/condiciones-uso" target="_blank" rel="noopener noreferrer" className="hover:underline text-slate-400">
              condiciones de uso
            </a>
            {' '}del NAP. <span className="italic">Powered by MITRAMS.</span>
          </p>
        </div>

        <p className="text-[10px] text-slate-300 leading-tight">
          Por <span className="text-slate-400 font-medium">David Antizar</span> · Mastermind
        </p>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop: always visible, part of normal flow */}
      <div className="hidden md:flex flex-shrink-0 min-h-screen">
        {sidebarContent}
      </div>

      {/* Mobile: overlay drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Drawer */}
          <div className="relative z-50 flex flex-col h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
