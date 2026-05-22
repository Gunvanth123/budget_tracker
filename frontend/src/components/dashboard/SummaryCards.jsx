import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, TrendingUp, TrendingDown, Activity, Eye, EyeOff } from 'lucide-react'
import { formatCurrency } from '../../utils/helpers'
import { motion } from 'framer-motion'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

function Sparkline({ data, color }) {
  return (
    <div className="w-20 sm:w-28 h-8 opacity-80 shrink-0">
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
    value: type === 'income' ? t.income : type === 'expense' ? t.expense : (t.expense * 0.95 + t.income * 0.05)
  }))
}

export default function SummaryCards({ summary, dailyTrends }) {
  const [hideBalance, setHideBalance] = useState(() => {
    return localStorage.getItem('hide-balance') === 'true'
  })

  const toggleHideBalance = () => {
    const newVal = !hideBalance
    setHideBalance(newVal)
    localStorage.setItem('hide-balance', String(newVal))
  }

  if (!summary) {
    return (
      <div className="space-y-4">
        {/* Loading placeholder for Balance Card */}
        <div className="card p-6 animate-pulse h-36" style={{ background: 'var(--border)' }} />
        {/* Loading placeholder for 3 mini cards */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-4 animate-pulse h-24" style={{ background: 'var(--border)' }} />
          ))}
        </div>
      </div>
    )
  }

  const balance = summary.total_balance ?? 0
  const income = summary.total_income ?? 0
  const expense = summary.total_expense ?? 0
  const forecast = summary.forecasted_expense ?? 0

  return (
    <div className="space-y-4">
      {/* 1. Large Total Balance Card */}
      <motion.div 
        whileHover={{ y: -2 }}
        className="card p-6 text-white overflow-hidden relative border-0"
        style={{ 
          background: 'var(--balance-grad)',
          boxShadow: '0 15px 35px -10px rgba(59, 130, 246, 0.4)'
        }}
      >
        {/* Decorative glass overlay glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex justify-between items-center relative z-10">
          <span className="text-xs uppercase tracking-widest font-bold opacity-80">Total Balance</span>
          <button 
            onClick={toggleHideBalance}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            {hideBalance ? <EyeOff className="w-4 h-4 text-white" /> : <Eye className="w-4 h-4 text-white" />}
          </button>
        </div>

        <div className="mt-4 relative z-10">
          <h2 className="text-3xl font-extrabold tracking-tight">
            {hideBalance ? '₹••••••' : formatCurrency(balance)}
          </h2>
        </div>

        <div className="mt-4 flex items-center gap-1.5 relative z-10">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
            <TrendingUp className="w-3 h-3 text-emerald-300" />
            <span>12.5% vs last month</span>
          </div>
        </div>
      </motion.div>

      {/* 2. Overview card replacing the 3 mini-cards */}
      <motion.div 
        whileHover={{ y: -2 }}
        className="card p-5 space-y-4"
      >
        <div className="flex justify-between items-center mb-1">
          <h3 className="font-bold text-sm tracking-wide" style={{ color: 'var(--text)' }}>Overview</h3>
          <Link 
            to="/analytics" 
            className="text-[11px] font-bold flex items-center gap-1 hover:opacity-85 transition-opacity"
            style={{ color: '#6366f1' }}
          >
            See All &gt;
          </Link>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {/* Income Row */}
          <div className="flex items-center justify-between py-3 first:pt-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Income</span>
                <p className="font-extrabold text-base text-emerald-500 mt-0.5 truncate">
                  {hideBalance ? '₹••••••' : formatCurrency(income)}
                </p>
              </div>
            </div>
            <Sparkline data={getSparklineData(dailyTrends, 'income')} color="#10B981" />
          </div>

          {/* Expense Row */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-rose-500/10 border border-rose-500/20 shrink-0">
                <TrendingDown className="w-5 h-5 text-rose-500" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Expense</span>
                <p className="font-extrabold text-base text-rose-500 mt-0.5 truncate">
                  {hideBalance ? '₹••••••' : formatCurrency(expense)}
                </p>
              </div>
            </div>
            <Sparkline data={getSparklineData(dailyTrends, 'expense')} color="#EF4444" />
          </div>

          {/* Forecast Row */}
          <div className="flex items-center justify-between py-3 last:pb-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-purple-500/10 border border-purple-500/20 shrink-0">
                <Activity className="w-5 h-5 text-purple-500" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Monthly Forecast</span>
                <p className="font-extrabold text-base text-purple-500 mt-0.5 truncate">
                  {hideBalance ? '₹••••••' : formatCurrency(forecast)}
                </p>
              </div>
            </div>
            <Sparkline data={getSparklineData(dailyTrends, 'forecast')} color="#8B5CF6" />
          </div>
        </div>
      </motion.div>
    </div>
  )
}
