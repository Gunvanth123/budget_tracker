import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { transactionsApi } from '../../api/client'
import { formatCurrency, formatDate } from '../../utils/helpers'
import { ArrowUpRight, ArrowDownLeft, ChevronRight } from 'lucide-react'

export default function RecentTransactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    transactionsApi.getAll({ limit: 8 })
      .then(setTransactions)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-slate-800">Recent Transactions</h3>
        <Link
          to="/transactions"
          className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
        >
          View all <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-9 h-9 rounded-xl bg-slate-200 flex-shrink-0" />
              <div className="flex-1">
                <div className="h-3 w-32 bg-slate-200 rounded mb-1.5" />
                <div className="h-2.5 w-20 bg-slate-100 rounded" />
              </div>
              <div className="h-4 w-20 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <p className="text-4xl mb-2">💸</p>
          <p className="text-sm font-medium">No transactions yet</p>
          <p className="text-xs mt-1">Go to Transactions to add your first entry</p>
        </div>
      ) : (
        <div className="space-y-1">
          {transactions.map((txn) => (
            <div key={txn.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                txn.type === 'income' ? 'bg-emerald-50' : 'bg-red-50'
              }`}>
                {txn.type === 'income'
                  ? <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                  : <ArrowDownLeft className="w-4 h-4 text-red-500" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">
                  {txn.notes || txn.category?.name || 'Transaction'}
                </p>
                <p className="text-xs text-slate-400">
                  {txn.category?.name} · {txn.account?.name} · {formatDate(txn.date)}
                </p>
              </div>
              <span className={txn.type === 'income' ? 'amount-income text-sm' : 'amount-expense text-sm'}>
                {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
