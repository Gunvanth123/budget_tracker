import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine
} from 'recharts'
import { formatCurrency } from '../../utils/helpers'
import { format, parseISO } from 'date-fns'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 min-w-[160px]">
      <p className="font-semibold text-slate-600 text-xs mb-2">
        {label ? format(parseISO(label), 'dd MMM') : ''}
      </p>
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

const formatXAxis = (dateStr) => {
  if (!dateStr) return ''
  try { return format(parseISO(dateStr), 'dd') } catch { return '' }
}

const formatYAxis = (value) => {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`
  return `₹${value}`
}

export default function DailyLineChart({ data }) {
  // Show every 5th label to avoid crowding
  const tickCount = 6
  const tickIndices = data
    ? Array.from({ length: tickCount }, (_, i) => Math.round((i / (tickCount - 1)) * (data.length - 1)))
    : []

  if (!data || data.length === 0) {
    return (
      <div className="card p-5 h-72 flex flex-col items-center justify-center text-slate-400">
        <span className="text-3xl mb-3">📈</span>
        <p className="font-medium text-sm">No trend data</p>
        <p className="text-xs mt-1">Transactions from last 30 days will appear here</p>
      </div>
    )
  }

  const filteredData = data.filter((_, i) => true) // Keep all points, just limit labels

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-slate-800">Daily Trends</h3>
        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Last 30 days</span>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData}>
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f87171" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxis}
              tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'DM Sans' }}
              axisLine={false}
              tickLine={false}
              interval={Math.floor(filteredData.length / 6)}
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'DM Sans' }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '12px', fontFamily: 'DM Sans', paddingTop: '12px' }}
            />
            <Line
              type="monotone"
              dataKey="income"
              name="Income"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: '#22c55e' }}
            />
            <Line
              type="monotone"
              dataKey="expense"
              name="Expense"
              stroke="#f87171"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: '#f87171' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
