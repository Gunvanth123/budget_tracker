import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { formatCurrency } from '../../utils/helpers'
import { format, parseISO } from 'date-fns'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">
        {label ? format(parseISO(label), 'dd MMM') : ''}
      </p>
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

const formatXAxis = (dateStr) => {
  if (!dateStr) return ''
  try { return format(parseISO(dateStr), 'dd') } catch { return '' }
}

const formatYAxis = (value) => {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`
  return `₹${value}`
}

// Read CSS vars at render time so charts respect current theme
const getCSSVar = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim()

export default function DailyLineChart({ data }) {
  const gridColor    = getCSSVar('--chart-grid') || '#334155'
  const mutedColor   = getCSSVar('--text-muted')  || '#94A3B8'
  const incomeColor  = getCSSVar('--chart-4')     || '#22C55E'
  const expenseColor = getCSSVar('--chart-5')     || '#EF4444'

  if (!data || data.length === 0) {
    return (
      <div className="card p-5 h-72 flex flex-col items-center justify-center">
        <span className="text-3xl mb-3">📈</span>
        <p className="font-medium text-sm" style={{ color: 'var(--text-muted)' }}>No trend data</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Transactions from last 30 days will appear here</p>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Daily Trends</h3>
        <span
          className="text-xs px-2 py-1 rounded-full"
          style={{ color: 'var(--text-muted)', background: 'var(--border)' }}
        >
          Last 30 days
        </span>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={incomeColor}  stopOpacity={0.12} />
                <stop offset="95%" stopColor={incomeColor}  stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={expenseColor} stopOpacity={0.12} />
                <stop offset="95%" stopColor={expenseColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxis}
              tick={{ fontSize: 10, fill: mutedColor, fontFamily: 'Poppins' }}
              axisLine={false}
              tickLine={false}
              interval={Math.floor(data.length / 6)}
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fontSize: 10, fill: mutedColor, fontFamily: 'Poppins' }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '12px', fontFamily: 'Poppins', paddingTop: '12px', color: 'var(--text-muted)' }}
            />
            <Line
              type="monotone"
              dataKey="income"
              name="Income"
              stroke={incomeColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: incomeColor }}
            />
            <Line
              type="monotone"
              dataKey="expense"
              name="Expense"
              stroke={expenseColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: expenseColor }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
