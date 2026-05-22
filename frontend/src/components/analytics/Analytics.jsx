import { useState, useEffect } from 'react'
import { dashboardApi, usageApi } from '../../api/client'
import MonthlyBarChart from '../dashboard/MonthlyBarChart'
import DailyLineChart from '../dashboard/DailyLineChart'
import toast from 'react-hot-toast'
import { BarChart2, Calendar } from 'lucide-react'
import MonthYearPicker from '../MonthYearPicker'
import { motion } from 'framer-motion'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

function Sparkline({ data, color }) {
  return (
    <div className="w-16 sm:w-20 h-8 opacity-80 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, bottom: 2, left: 2, right: 2 }}>
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={1.5} 
            dot={false} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

const getSparklineData = (trends, type) => {
  if (!trends || trends.length === 0) {
    return [
      { value: 30 }, { value: 32 }, { value: 31 }, { value: 35 }, 
      { value: 33 }, { value: 38 }, { value: 36 }, { value: 42 }, 
      { value: 40 }, { value: 45 }, { value: 42 }, { value: 48 },
      { value: 45 }, { value: 52 }, { value: 49 }, { value: 55 }
    ]
  }
  return trends.map(t => ({
    value: type === 'income' ? t.income : type === 'expense' ? t.expense : type === 'forecast' ? (t.expense * 0.95 + t.income * 0.05) : (t.income - t.expense)
  }))
}

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('30D') // '7D', '30D', '3M', '6M', '1Y'
  const [selectedMonth, setSelectedMonth] = useState('')

  const fetchAnalyticsData = async () => {
    try {
      const response = await dashboardApi.get(timeframe ? null : selectedMonth, timeframe)
      setData(response)
    } catch (err) {
      toast.error('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalyticsData()
    usageApi.track('analytics')

    // Listen to transaction updates
    const handler = () => fetchAnalyticsData();
    window.addEventListener('transaction-saved', handler);
    return () => window.removeEventListener('transaction-saved', handler);
  }, [timeframe, selectedMonth])

  const TIMEFRAMES = ['7D', '30D', '3M', '6M', '1Y']

  const months = []
  const today = new Date()
  for (let i = 0; i < 48; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    months.push(`${y}-${m}`)
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6 pb-12"
    >
      {/* Timeframe Swapper */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-500" />
            Financial Analytics
          </h2>
          <p className="text-xs opacity-60 mt-0.5">Visualize your earnings, spendings, and budget trends</p>
        </div>

        {/* Filters Group (Timeframe & Month) */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Filter Pills */}
          <div 
            className="flex rounded-2xl p-1 gap-1 border justify-between sm:justify-start flex-1 sm:flex-initial"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            {TIMEFRAMES.map(tf => (
              <button
                key={tf}
                onClick={() => {
                  timeframe === tf ? null : setTimeframe(tf)
                  setSelectedMonth('')
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all relative"
                style={{
                  color: timeframe === tf ? '#fff' : 'var(--text-muted)'
                }}
              >
                <span className="relative z-10">{tf}</span>
                {timeframe === tf && (
                  <motion.div
                    layoutId="active-timeframe"
                    className="absolute inset-0 bg-indigo-500 rounded-xl z-0"
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Month Selector Picker */}
          <MonthYearPicker
            value={selectedMonth}
            onChange={(val) => {
              setSelectedMonth(val)
              if (val) {
                setTimeframe(null)
              } else {
                setTimeframe('30D')
              }
            }}
            months={months}
          />
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 mt-4">Loading charts and trends...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Monthly overview bar chart container */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MonthlyBarChart data={data?.monthly_comparison} />
            
            {/* Daily Trends line chart container */}
            <DailyLineChart data={data?.daily_trends} />
          </div>

          {/* Quick analysis details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Calendar className="w-5 h-5 text-emerald-500" />
              <h3 className="font-extrabold text-sm tracking-wide text-[var(--text)]">
                Quick Monthly Health Summary
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Card 1: Total Balance */}
              <motion.div 
                whileHover={{ y: -4, scale: 1.01 }}
                className="card p-5 flex items-center justify-between gap-4 relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300"
              >
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
                <div className="min-w-0 relative z-10">
                  <span className="text-[11px] uppercase font-bold tracking-wider text-indigo-500 block">Total Balance</span>
                  <p className="text-xl font-extrabold mt-1 truncate text-[var(--text)]">
                    ₹{data?.summary?.total_balance?.toLocaleString() || 0}
                  </p>
                  <span className="text-[11px] text-[var(--text-muted)] block mt-1">Available net balance</span>
                </div>
                <div className="relative z-10 shrink-0">
                  <Sparkline data={getSparklineData(data?.daily_trends, 'balance')} color="#6366F1" />
                </div>
              </motion.div>

              {/* Card 2: Income */}
              <motion.div 
                whileHover={{ y: -4, scale: 1.01 }}
                className="card p-5 flex items-center justify-between gap-4 relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300"
              >
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
                <div className="min-w-0 relative z-10">
                  <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-500 block">Total Income Flow</span>
                  <p className="text-xl font-extrabold mt-1 truncate text-[var(--text)]">
                    ₹{data?.summary?.total_income?.toLocaleString() || 0}
                  </p>
                  <span className="text-[11px] text-[var(--text-muted)] block mt-1">For current billing period</span>
                </div>
                <div className="relative z-10 shrink-0">
                  <Sparkline data={getSparklineData(data?.daily_trends, 'income')} color="#10B981" />
                </div>
              </motion.div>

              {/* Card 3: Expense */}
              <motion.div 
                whileHover={{ y: -4, scale: 1.01 }}
                className="card p-5 flex items-center justify-between gap-4 relative overflow-hidden group hover:border-rose-500/30 transition-all duration-300"
              >
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-500/10 dark:bg-rose-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
                <div className="min-w-0 relative z-10">
                  <span className="text-[11px] uppercase font-bold tracking-wider text-rose-500 block">Expenses Deducted</span>
                  <p className="text-xl font-extrabold mt-1 truncate text-[var(--text)]">
                    ₹{data?.summary?.total_expense?.toLocaleString() || 0}
                  </p>
                  <span className="text-[11px] text-[var(--text-muted)] block mt-1">All registered debit accounts</span>
                </div>
                <div className="relative z-10 shrink-0">
                  <Sparkline data={getSparklineData(data?.daily_trends, 'expense')} color="#EF4444" />
                </div>
              </motion.div>

              {/* Card 4: Forecast */}
              <motion.div 
                whileHover={{ y: -4, scale: 1.01 }}
                className="card p-5 flex items-center justify-between gap-4 relative overflow-hidden group hover:border-purple-500/30 transition-all duration-300"
              >
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
                <div className="min-w-0 relative z-10">
                  <span className="text-[11px] uppercase font-bold tracking-wider text-purple-500 block">Forecasted Expense</span>
                  <p className="text-xl font-extrabold mt-1 truncate text-[var(--text)]">
                    ₹{data?.summary?.forecasted_expense?.toLocaleString() || 0}
                  </p>
                  <span className="text-[11px] text-[var(--text-muted)] block mt-1">Projected month-end spend</span>
                </div>
                <div className="relative z-10 shrink-0">
                  <Sparkline data={getSparklineData(data?.daily_trends, 'forecast')} color="#a855f7" />
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
