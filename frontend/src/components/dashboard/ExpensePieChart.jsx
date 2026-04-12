import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '../../utils/helpers'

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{d.category}</p>
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-name">
          <span className="chart-tooltip-dot" style={{ background: d.color }} />
          Amount
        </span>
        <span className="chart-tooltip-value">{formatCurrency(d.amount)}</span>
      </div>
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-name">Share</span>
        <span className="chart-tooltip-value">{d.percentage}%</span>
      </div>
    </div>
  )
}

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }) => {
  if (percentage < 5) return null
  const RADIAN = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${percentage}%`}
    </text>
  )
}

export default function ExpensePieChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="card p-5 h-80 flex flex-col items-center justify-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
          style={{ background: 'var(--border)' }}
        >
          <span className="text-2xl">🍕</span>
        </div>
        <p className="font-medium text-sm" style={{ color: 'var(--text-muted)' }}>No expense data yet</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Add some expense transactions to see breakdown</p>
      </div>
    )
  }

  return (
    <div className="card p-5 flex flex-col h-full">
      <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>Expense by Category</h3>
      <div className="flex-1 min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius="70%"
              innerRadius="35%"
              dataKey="amount"
              nameKey="category"
              labelLine={false}
              label={renderCustomLabel}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="transparent" strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-3 space-y-1.5 max-h-40 overflow-y-auto">
        {data.slice(0, 6).map((item, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
              <span className="truncate max-w-[120px]" style={{ color: 'var(--text-muted)' }}>{item.category}</span>
            </div>
            <span className="font-medium" style={{ color: 'var(--text)' }}>{formatCurrency(item.amount)}</span>
          </div>
        ))}
        {data.length > 6 && (
          <p className="text-xs pl-4" style={{ color: 'var(--text-muted)' }}>+{data.length - 6} more categories</p>
        )}
      </div>
    </div>
  )
}
