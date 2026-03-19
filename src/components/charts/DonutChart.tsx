import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface PieItem {
  name: string
  value: number
}

interface Props {
  data: PieItem[]
  title: string
}

// Paleta accesible en escala de grises
const COLORS = ['#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe']

export function DonutChart({ data, title }: Props) {
  // Máx 7 categorías + "Otros"
  const sorted = [...data].sort((a, b) => b.value - a.value)
  const top = sorted.slice(0, 6)
  const rest = sorted.slice(6)
  const chartData: PieItem[] =
    rest.length > 0
      ? [...top, { name: 'Otros', value: rest.reduce((s, d) => s + d.value, 0) }]
      : top

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v) => [v, 'Datasets']}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span style={{ fontSize: 11, color: '#475569' }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
