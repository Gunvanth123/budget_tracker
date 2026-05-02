import { useState, useEffect, useCallback } from 'react'
import { transactionsApi, categoriesApi, accountsApi } from '../../api/client'
import { formatCurrency, formatDate } from '../../utils/helpers'
import TransactionForm from './TransactionForm'
import ExportModal from './ExportModal'
import { Plus, Pencil, Trash2, Filter, Search, ArrowUpRight, ArrowDownLeft, Download } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
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
          onClick={() => setExportModalOpen(true)}
          className="btn-secondary flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
        <button
          onClick={() => { setEditData(null); setFormOpen(true) }}
          className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Add Transaction
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card p-3 sm:p-4 text-center flex flex-row sm:flex-col items-center sm:justify-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Showing</p>
          <p className="font-bold text-lg" style={{ color: 'var(--text)' }}>{filtered.length}</p>
        </div>
        <div className="card p-3 sm:p-4 text-center flex flex-row sm:flex-col items-center sm:justify-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Income</p>
          <p className="font-bold text-lg" style={{ color: '#22C55E' }}>{formatCurrency(totalIncome)}</p>
        </div>
        <div className="card p-3 sm:p-4 text-center flex flex-row sm:flex-col items-center sm:justify-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Expense</p>
          <p className="font-bold text-lg" style={{ color: '#EF4444' }}>{formatCurrency(totalExpense)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
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
                <div className="w-10 h-10 rounded-xl" style={{ background: 'var(--border)' }} />
                <div className="flex-1">
                  <div className="h-3.5 w-40 rounded mb-2" style={{ background: 'var(--border)' }} />
                  <div className="h-3 w-24 rounded" style={{ background: 'var(--border)' }} />
                </div>
                <div className="h-4 w-24 rounded" style={{ background: 'var(--border)' }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
            <p className="text-4xl mb-3">📭</p>
            <p className="font-medium">No transactions found</p>
            <p className="text-sm mt-1">Try changing your filters or add a new transaction</p>
          </div>
        ) : (
          <div style={{ borderTop: '1px solid var(--border)' }}>
            {/* Table header */}
            <div
              className="hidden md:grid items-center gap-0 px-5 py-3 text-xs font-bold uppercase tracking-wide"
              style={{
                gridTemplateColumns: '40px 1fr 130px 110px 110px 72px',
                background: 'var(--bg)',
                color: 'var(--text-muted)',
                borderBottom: '1px solid var(--border)'
              }}
            >
              <div>Type</div>
              <div className="pl-3">Details</div>
              <div>Account</div>
              <div>Date</div>
              <div className="text-right">Amount</div>
              <div className="text-right">Actions</div>
            </div>

            {filtered.map((txn) => (
              <div
                key={txn.id}
                className="hidden md:grid items-center px-5 py-3 transition-colors"
                style={{
                  gridTemplateColumns: '40px 1fr 130px 110px 110px 72px',
                  borderBottom: '1px solid var(--border)'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,65,85,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: txn.type === 'income' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)' }}
                >
                  {txn.type === 'income'
                    ? <ArrowUpRight className="w-4 h-4" style={{ color: '#22C55E' }} />
                    : <ArrowDownLeft className="w-4 h-4" style={{ color: '#EF4444' }} />
                  }
                </div>

                {/* Details */}
                <div className="min-w-0 pl-3 flex flex-col justify-center">
                  <p className="text-sm font-medium line-clamp-1 hover:line-clamp-none transition-all break-words" style={{ color: 'var(--text)' }}>
                    {txn.notes || txn.category?.name}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    <span className={txn.type === 'income' ? 'badge-income' : 'badge-expense'}>
                      {txn.category?.name}
                    </span>
                  </div>
                </div>

                {/* Account */}
                <span
                  className="text-xs px-2 py-1 rounded-full w-fit"
                  style={{ color: 'var(--text-muted)', background: 'var(--border)' }}
                >
                  {txn.account?.name}
                </span>

                {/* Date */}
                <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                  {formatDate(txn.date)}
                </span>

                {/* Amount */}
                <span
                  className="font-mono font-semibold text-sm whitespace-nowrap text-right"
                  style={{ color: txn.type === 'income' ? '#22C55E' : '#EF4444' }}
                >
                  {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                </span>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => handleEdit(txn)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.color = 'var(--primary)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(txn.id)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#EF4444' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Mobile rows (stacked layout — only visible on small screens) */}
            {filtered.map((txn) => (
              <div
                key={`m-${txn.id}`}
                className="flex md:hidden items-center gap-3 px-4 py-3 transition-colors"
                style={{ borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,65,85,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: txn.type === 'income' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)' }}
                >
                  {txn.type === 'income'
                    ? <ArrowUpRight className="w-4 h-4" style={{ color: '#22C55E' }} />
                    : <ArrowDownLeft className="w-4 h-4" style={{ color: '#EF4444' }} />
                  }
                </div>
                <div className="flex-1 min-w-0 py-1">
                  <p className="text-sm font-medium leading-tight mb-1 break-words line-clamp-2" style={{ color: 'var(--text)' }}>
                    {txn.notes || txn.category?.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={txn.type === 'income' ? 'badge-income' : 'badge-expense'}>
                      {txn.category?.name}
                    </span>
                    <span className="text-[10px] opacity-40 uppercase font-bold tracking-widest">
                      • {txn.account?.name}
                    </span>
                  </div>
                </div>
                <span className="font-mono font-semibold text-sm" style={{ color: txn.type === 'income' ? '#22C55E' : '#EF4444' }}>
                  {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(txn)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.color = 'var(--primary)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  ><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(txn.id)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#EF4444' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  ><Trash2 className="w-3.5 h-3.5" /></button>
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
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        transactions={filtered}
      />
    </div>
  )
}
