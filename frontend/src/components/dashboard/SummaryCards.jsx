import { Wallet, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { formatCurrency } from '../../utils/helpers'

const cards = [
  {
    key: 'total_balance',
    label: 'Total Balance',
    icon: Wallet,
    gradient: 'from-[#00A19B] to-[#007A75]',
    bg: '#00A19B',
  },
  {
    key: 'total_income',
    label: 'Total Income',
    icon: TrendingUp,
    gradient: 'from-[#22C55E] to-[#16A34A]',
    bg: '#22C55E',
  },
  {
    key: 'total_expense',
    label: 'Total Expense',
    icon: TrendingDown,
    gradient: 'from-[#EF4444] to-[#DC2626]',
    bg: '#EF4444',
  },
  {
    key: 'net',
    label: 'Net Balance',
    icon: Activity,
    gradient: 'from-[#F59E0B] to-[#D97706]',
    bg: '#F59E0B',
  },
]

export default function SummaryCards({ summary }) {
  if (!summary) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="card p-5 animate-pulse">
            <div className="h-8 w-8 rounded-xl mb-3" style={{ background: 'var(--border)' }} />
            <div className="h-3 w-20 rounded mb-2" style={{ background: 'var(--border)' }} />
            <div className="h-6 w-28 rounded" style={{ background: 'var(--border)' }} />
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
            {/* Background accent blob */}
            <div
              className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 group-hover:opacity-20 transition-opacity"
              style={{ background: bg }}
            />

            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} shadow-sm mb-3`}>
              <Icon className="w-5 h-5 text-white" />
            </div>

            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {label}
            </p>
            <p
              className="text-xl font-bold mt-1"
              style={{ color: isNegative ? '#EF4444' : 'var(--text)' }}
            >
              {isNegative && <span className="text-base mr-0.5">-</span>}
              {formatCurrency(Math.abs(value))}
            </p>
            {isNegative && (
              <span className="text-xs" style={{ color: '#EF4444' }}>Deficit</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
