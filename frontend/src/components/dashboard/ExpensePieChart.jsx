import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { formatCurrency } from '../../utils/helpers'

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3">
      <p className="font-semibold text-slate-700 text-sm">{d.category}</p>
      <p className="text-brand-600 font-mono text-sm">{formatCurrency(d.amount)}</p>
      <p className="text-slate-400 text-xs">{d.percentage}% of total</p>
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
      <div className="card p-5 h-80 flex flex-col items-center justify-center text-slate-400">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
          <span className="text-2xl">🍕</span>
        </div>
        <p className="font-medium text-sm">No expense data yet</p>
        <p className="text-xs mt-1">Add some expense transactions to see breakdown</p>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <h3 className="font-display font-bold text-slate-800 mb-4">Expense by Category</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={90}
              innerRadius={40}
              dataKey="amount"
              nameKey="category"
              labelLine={false}
              label={renderCustomLabel}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />
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
              <span className="text-slate-600 truncate max-w-[120px]">{item.category}</span>
            </div>
            <span className="font-mono font-medium text-slate-700">{formatCurrency(item.amount)}</span>
          </div>
        ))}
        {data.length > 6 && (
          <p className="text-xs text-slate-400 pl-4">+{data.length - 6} more categories</p>
        )}
      </div>
    </div>
  )
}
