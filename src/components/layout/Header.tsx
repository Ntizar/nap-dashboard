interface HeaderProps {
  title: string
  subtitle?: string
  onMenuToggle?: () => void
}

export function Header({ title, subtitle, onMenuToggle }: HeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 flex-shrink-0 flex items-center gap-3">
      {/* Hamburger — only on mobile */}
      {onMenuToggle && (
        <button
          onClick={onMenuToggle}
          className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors flex-shrink-0"
          aria-label="Abrir menú"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      )}
      <div>
        <h2 className="text-lg font-semibold leading-tight" style={{ color: 'var(--nap-blue-dark, #0f3460)' }}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        )}
      </div>
    </header>
  )
}
