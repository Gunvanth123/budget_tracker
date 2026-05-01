import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { formatCurrency } from '../../utils/helpers'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="chart-tooltip-row">
          <span className="chart-tooltip-name">
            <span className="chart-tooltip-dot" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="chart-tooltip-value">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

const formatYAxis = (value) => {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`
  return `₹${value}`
}

// Read CSS vars at render time so charts respect current theme
const getCSSVar = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim()

export default function MonthlyBarChart({ data }) {
  const gridColor   = getCSSVar('--chart-grid') || '#334155'
  const mutedColor  = getCSSVar('--text-muted')  || '#94A3B8'
  const incomeColor = getCSSVar('--chart-4')     || '#22C55E'
  const expenseColor= getCSSVar('--chart-5')     || '#EF4444'

  if (!data || data.length === 0) {
    return (
      <div className="card p-5 h-full flex flex-col items-center justify-center min-h-[300px]">
        <span className="text-3xl mb-3">📊</span>
        <p className="font-medium text-sm" style={{ color: 'var(--text-muted)' }}>No monthly data yet</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Add transactions to see monthly trends</p>
      </div>
    )
  }

  return (
    <div className="card p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Monthly Overview</h3>
        <span
          className="text-xs px-2 py-1 rounded-full"
          style={{ color: 'var(--text-muted)', background: 'var(--border)' }}
        >
          Last {data.length} months
        </span>
      </div>
      <div className="flex-1 min-h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={6} barCategoryGap="35%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: mutedColor, fontFamily: 'Poppins' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fontSize: 10, fill: mutedColor, fontFamily: 'Poppins' }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--border)', radius: 8, opacity: 0.3 }} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '12px', fontFamily: 'Poppins', paddingTop: '12px', color: 'var(--text-muted)' }}
            />
            <Bar dataKey="income"  name="Income"  fill={incomeColor}  radius={[6, 6, 0, 0]} maxBarSize={54} />
            <Bar dataKey="expense" name="Expense" fill={expenseColor} radius={[6, 6, 0, 0]} maxBarSize={54} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
