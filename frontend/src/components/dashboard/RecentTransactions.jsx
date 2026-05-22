import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { transactionsApi } from '../../api/client'
import { formatCurrency, formatDate } from '../../utils/helpers'
import { ArrowUpRight, ArrowDownLeft, ChevronRight } from 'lucide-react'

export default function RecentTransactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTransactions = () => {
    transactionsApi.getAll({ limit: 8 })
      .then(setTransactions)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchTransactions()

    // Sync when a new transaction is saved
    const handler = () => fetchTransactions();
    window.addEventListener('transaction-saved', handler);
    return () => window.removeEventListener('transaction-saved', handler);
  }, [])

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold tracking-wide text-sm" style={{ color: 'var(--text)' }}>Recent Transactions</h3>
        <Link
          to="/transactions"
          className="flex items-center gap-0.5 text-xs font-bold text-indigo-500 hover:text-indigo-600 transition-colors"
        >
          View all <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 flex-shrink-0" />
                <div>
                  <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded mb-1.5" />
                  <div className="h-2.5 w-20 bg-slate-100 dark:bg-slate-900 rounded" />
                </div>
              </div>
              <div>
                <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded mb-1" />
                <div className="h-2.5 w-12 bg-slate-100 dark:bg-slate-900 rounded justify-end ml-auto" />
              </div>
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8 opacity-60">
          <p className="text-3xl mb-2">💸</p>
          <p className="text-xs font-bold">No transactions yet</p>
          <p className="text-[10px] mt-0.5">Start logging your expenses to see list</p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((txn) => {
            const isIncome = txn.type === 'income'
            return (
              <div 
                key={txn.id} 
                className="flex items-center justify-between p-2 rounded-2xl hover:bg-white/5 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                {/* Left side: Icon + Titles */}
                <div className="flex items-center gap-3 min-w-0">
                  <div 
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                      isIncome 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                    }`}
                  >
                    {isIncome
                      ? <ArrowUpRight className="w-4 h-4" />
                      : <ArrowDownLeft className="w-4 h-4" />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: 'var(--text)' }}>
                      {txn.notes || txn.category?.name || 'Transaction'}
                    </p>
                    <p className="text-[10px] opacity-40 font-semibold mt-0.5 truncate">
                      {txn.category?.name || 'Other'} · {txn.account?.name || 'Wallet'}
                    </p>
                  </div>
                </div>

                {/* Right side: Amount + Date */}
                <div className="text-right flex-shrink-0 pl-3">
                  <span className={`text-xs font-extrabold block ${isIncome ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isIncome ? '+' : '-'}{formatCurrency(txn.amount)}
                  </span>
                  <span className="text-[9px] opacity-40 font-semibold block mt-0.5">
                    {formatDate(txn.date)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
