interface KpiCardProps {
  label: string
  value: number | string
  description?: string
  color?: 'blue' | 'orange' | 'yellow' | 'teal' | 'purple'
  icon?: React.ReactNode
}

const colorMap: Record<string, { bg: string; text: string }> = {
  blue:   { bg: 'linear-gradient(135deg, #1a56a0, #2b6cb0)', text: '#fff' },
  orange: { bg: 'linear-gradient(135deg, #e87722, #f5a623)', text: '#fff' },
  yellow: { bg: 'linear-gradient(135deg, #f5a623, #f6c142)', text: '#fff' },
  teal:   { bg: 'linear-gradient(135deg, #00a896, #00c9b1)', text: '#fff' },
  purple: { bg: 'linear-gradient(135deg, #6b46c1, #805ad5)', text: '#fff' },
}

export function KpiCard({ label, value, description, color = 'blue', icon }: KpiCardProps) {
  const { bg, text } = colorMap[color]
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-2 shadow-sm"
      style={{ background: bg, color: text }}
    >
      {icon && (
        <div className="opacity-80 mb-1">{icon}</div>
      )}
      <p className="text-sm font-semibold opacity-90 leading-tight">{label}</p>
      <p className="text-3xl font-bold tracking-tight">
        {typeof value === 'number' ? value.toLocaleString('es-ES') : value}
      </p>
      {description && (
        <p className="text-xs opacity-70 leading-tight">{description}</p>
      )}
    </div>
  )
}
