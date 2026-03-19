interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
      <h2 className="text-lg font-semibold" style={{ color: 'var(--nap-blue-dark, #0f3460)' }}>
        {title}
      </h2>
      {subtitle && (
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      )}
    </header>
  )
}
