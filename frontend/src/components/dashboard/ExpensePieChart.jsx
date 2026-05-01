import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from 'recharts'
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

const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 8}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      stroke="none"
      filter="url(#shadow-active)"
      style={{ cursor: 'pointer' }}
    />
  )
}

export default function ExpensePieChart({ data, selectedMonth, onMonthChange, months }) {
  const [showAll, setShowAll] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const onPieEnter = (_, index) => setActiveIndex(index)
  const onPieLeave = () => setActiveIndex(-1)

  if (!data || data.length === 0) {
    return (
      <div className="card p-5 h-80 flex flex-col items-center justify-center relative">
        <div className="absolute top-4 right-4">
          <select 
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="select-pill"
          >
            {months?.map(m => (
              <option key={m} value={m}>
                {new Date(m).toLocaleString('default', { month: 'short', year: 'numeric' })}
              </option>
            ))}
          </select>
        </div>
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
          style={{ background: 'var(--border)' }}
        >
          <span className="text-2xl">🍕</span>
        </div>
        <p className="font-medium text-sm" style={{ color: 'var(--text-muted)' }}>No expense data for this month</p>
      </div>
    )
  }

  const totalAmount = data.reduce((acc, item) => acc + item.amount, 0)
  const displayedData = showAll ? data : data.slice(0, 6)

  return (
    <div className="card p-5 flex flex-col h-full relative group">
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col">
          <h3 className="font-bold text-base" style={{ color: 'var(--text)' }}>Expense by Category</h3>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Top spending distribution</p>
        </div>
        <select 
          value={selectedMonth}
          onChange={(e) => onMonthChange(e.target.value)}
          className="select-pill"
        >
          {months?.map(m => (
            <option key={m} value={m}>
              {new Date(m).toLocaleString('default', { month: 'short', year: 'numeric' })}
            </option>
          ))}
        </select>
      </div>
      
      <div className="flex-1 min-h-[240px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              <filter id="shadow" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                <feOffset dx="1" dy="3" result="offsetblur" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.3" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="shadow-active" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
                <feOffset dx="2" dy="6" result="offsetblur" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.5" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {data.map((entry, i) => (
                <linearGradient id={`colorGrad-${i}`} x1="0" y1="0" x2="0" y2="1" key={i}>
                  <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                  <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={data}
              cx="50%"
              cy="50%"
              outerRadius="85%"
              innerRadius="60%"
              dataKey="amount"
              nameKey="category"
              labelLine={false}
              label={renderCustomLabel}
              paddingAngle={5}
              stroke="none"
              filter="url(#shadow)"
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              style={{ outline: 'none' }}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={`url(#colorGrad-${i})`} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
          <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total</span>
          <span className="text-lg font-bold" style={{ color: 'var(--text)' }}>{formatCurrency(totalAmount)}</span>
        </div>
      </div>

      {/* Legend - Limited height to prevent expansion */}
      <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
        {displayedData.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-1 duration-300">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
              <span className="truncate max-w-[120px]" style={{ color: 'var(--text-muted)' }}>{item.category}</span>
            </div>
            <span className="font-medium" style={{ color: 'var(--text)' }}>{formatCurrency(item.amount)}</span>
          </div>
        ))}
        {data.length > 6 && (
          <button 
            onClick={() => setShowAll(!showAll)}
            className="text-xs pl-4 hover:underline cursor-pointer transition-all hover:text-indigo-500 text-left w-full mt-1" 
            style={{ color: 'var(--text-muted)' }}
          >
            {showAll ? 'Show less' : `+${data.length - 6} more categories`}
          </button>
        )}
      </div>
    </div>
  )
}
