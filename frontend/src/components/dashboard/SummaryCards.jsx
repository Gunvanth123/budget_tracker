import { Wallet, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { formatCurrency } from '../../utils/helpers'

const cards = [
  {
    key: 'total_balance',
    label: 'Total Balance',
    icon: Wallet,
    color: 'brand',
    gradient: 'from-brand-500 to-brand-700',
    bg: 'bg-brand-500',
  },
  {
    key: 'total_income',
    label: 'Total Income',
    icon: TrendingUp,
    color: 'emerald',
    gradient: 'from-emerald-500 to-emerald-700',
    bg: 'bg-emerald-500',
  },
  {
    key: 'total_expense',
    label: 'Total Expense',
    icon: TrendingDown,
    color: 'red',
    gradient: 'from-red-400 to-red-600',
    bg: 'bg-red-500',
  },
  {
    key: 'net',
    label: 'Net Savings',
    icon: Activity,
    color: 'violet',
    gradient: 'from-violet-500 to-violet-700',
    bg: 'bg-violet-500',
  },
]

export default function SummaryCards({ summary }) {
  if (!summary) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="card p-5 animate-pulse">
            <div className="h-8 w-8 rounded-xl bg-slate-200 mb-3" />
            <div className="h-3 w-20 bg-slate-200 rounded mb-2" />
            <div className="h-6 w-28 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ key, label, icon: Icon, bg, gradient }) => {
        const value = summary[key] ?? 0
        const isNegative = value < 0
        return (
          <div key={key} className="card p-5 group overflow-hidden relative">
            {/* Background accent */}
            <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full ${bg} opacity-5 group-hover:opacity-10 transition-opacity`} />

            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} shadow-sm mb-3`}>
              <Icon className="w-5 h-5 text-white" />
            </div>

            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
            <p className={`text-xl font-display font-bold mt-1 ${isNegative ? 'text-red-500' : 'text-slate-800'}`}>
              {formatCurrency(Math.abs(value))}
            </p>
            {isNegative && <span className="text-xs text-red-400">Deficit</span>}
          </div>
        )
      })}
    </div>
  )
}
