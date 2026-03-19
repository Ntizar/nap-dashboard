interface KpiCardProps {
  label: string
  value: number | string
  description?: string
  color?: 'blue' | 'green' | 'amber' | 'purple'
}

const colorMap = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
}

export function KpiCard({ label, value, description, color = 'blue' }: KpiCardProps) {
  return (
    <div className={`rounded-xl border p-5 ${colorMap[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-widest opacity-70">{label}</p>
      <p className="text-4xl font-bold mt-2">{value}</p>
      {description && <p className="text-xs mt-2 opacity-60">{description}</p>}
    </div>
  )
}
