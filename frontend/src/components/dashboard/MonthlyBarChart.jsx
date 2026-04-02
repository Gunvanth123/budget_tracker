import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { formatCurrency } from '../../utils/helpers'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 min-w-[160px]">
      <p className="font-semibold text-slate-600 text-xs mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-xs text-slate-500">{p.name}</span>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-700">{formatCurrency(p.value)}</span>
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

export default function MonthlyBarChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="card p-5 h-72 flex flex-col items-center justify-center text-slate-400">
        <span className="text-3xl mb-3">📊</span>
        <p className="font-medium text-sm">No monthly data yet</p>
        <p className="text-xs mt-1">Add transactions to see monthly trends</p>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-slate-800">Monthly Overview</h3>
        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Last 3 months</span>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'DM Sans' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'DM Sans' }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', radius: 8 }} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '12px', fontFamily: 'DM Sans', paddingTop: '12px' }}
            />
            <Bar dataKey="income" name="Income" fill="#22c55e" radius={[6, 6, 0, 0]} />
            <Bar dataKey="expense" name="Expense" fill="#f87171" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
