import { useState, useEffect, useCallback } from 'react'
import { transactionsApi, categoriesApi, accountsApi } from '../../api/client'
import { formatCurrency, formatDate } from '../../utils/helpers'
import TransactionForm from './TransactionForm'
import { Plus, Pencil, Trash2, Filter, Search, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState(null)

  // Filters
  const [filters, setFilters] = useState({
    type: '',
    category_id: '',
    account_id: '',
    search: '',
  })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.type) params.type = filters.type
      if (filters.category_id) params.category_id = filters.category_id
      if (filters.account_id) params.account_id = filters.account_id
      const [txns, cats, accs] = await Promise.all([
        transactionsApi.getAll(params),
        categoriesApi.getAll(),
        accountsApi.getAll(),
      ])
      setTransactions(txns)
      setCategories(cats)
      setAccounts(accs)
    } catch {
      toast.error('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [filters.type, filters.category_id, filters.account_id])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleDelete = async (id) => {
    if (!confirm('Delete this transaction?')) return
    try {
      await transactionsApi.delete(id)
      toast.success('Transaction deleted')
      fetchAll()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleEdit = (txn) => {
    setEditData(txn)
    setFormOpen(true)
  }

  const filtered = transactions.filter(txn => {
    if (!filters.search) return true
    const q = filters.search.toLowerCase()
    return (
      txn.notes?.toLowerCase().includes(q) ||
      txn.category?.name?.toLowerCase().includes(q) ||
      txn.account?.name?.toLowerCase().includes(q)
    )
  })

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1" />
        <button
          onClick={() => { setEditData(null); setFormOpen(true) }}
          className="btn-primary flex items-center gap-2 self-start"
        >
          <Plus className="w-4 h-4" />
          Add Transaction
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 text-center">
          <p className="text-xs text-slate-400 mb-0.5">Showing</p>
          <p className="font-display font-bold text-slate-700">{filtered.length}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-slate-400 mb-0.5">Income</p>
          <p className="font-display font-bold text-emerald-600 text-sm">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-slate-400 mb-0.5">Expense</p>
          <p className="font-display font-bold text-red-500 text-sm">{formatCurrency(totalExpense)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search transactions…"
              value={filters.search}
              onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
              className="input pl-8"
            />
          </div>
          <select
            value={filters.type}
            onChange={e => setFilters(p => ({ ...p, type: e.target.value }))}
            className="select"
          >
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select
            value={filters.category_id}
            onChange={e => setFilters(p => ({ ...p, category_id: e.target.value }))}
            className="select"
          >
            <option value="">All categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={filters.account_id}
            onChange={e => setFilters(p => ({ ...p, account_id: e.target.value }))}
            className="select"
          >
            <option value="">All accounts</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      {/* Transaction List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-slate-200" />
                <div className="flex-1">
                  <div className="h-3.5 w-40 bg-slate-200 rounded mb-2" />
                  <div className="h-3 w-24 bg-slate-100 rounded" />
                </div>
                <div className="h-4 w-24 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-medium">No transactions found</p>
            <p className="text-sm mt-1">Try changing your filters or add a new transaction</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {/* Table header - desktop */}
            <div className="hidden md:grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-5 py-3 bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wide">
              <div>Type</div>
              <div>Details</div>
              <div>Account</div>
              <div>Date</div>
              <div className="text-right">Amount</div>
              <div>Actions</div>
            </div>

            {filtered.map((txn) => (
              <div
                key={txn.id}
                className="flex md:grid md:grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-3 md:gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors"
              >
                {/* Icon */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  txn.type === 'income' ? 'bg-emerald-50' : 'bg-red-50'
                }`}>
                  {txn.type === 'income'
                    ? <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                    : <ArrowDownLeft className="w-4 h-4 text-red-500" />
                  }
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">
                    {txn.notes || txn.category?.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={txn.type === 'income' ? 'badge-income' : 'badge-expense'}>
                      {txn.category?.name}
                    </span>
                    <span className="md:hidden text-xs text-slate-400">· {txn.account?.name}</span>
                  </div>
                </div>

                {/* Account */}
                <span className="hidden md:block text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                  {txn.account?.name}
                </span>

                {/* Date */}
                <span className="hidden md:block text-xs text-slate-400 whitespace-nowrap">
                  {formatDate(txn.date)}
                </span>

                {/* Amount */}
                <span className={`font-mono font-semibold text-sm whitespace-nowrap ${
                  txn.type === 'income' ? 'text-emerald-600' : 'text-red-500'
                }`}>
                  {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(txn)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(txn.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TransactionForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={fetchAll}
        editData={editData}
      />
    </div>
  )
}
