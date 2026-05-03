import { useState, useEffect, useCallback, useRef } from 'react'
import { transactionsApi, categoriesApi, accountsApi } from '../../api/client'
import { formatCurrency, formatDate } from '../../utils/helpers'
import TransactionForm from './TransactionForm'
import ExportModal from './ExportModal'
import { Plus, Pencil, Trash2, Filter, Search, ArrowUpRight, ArrowDownLeft, Download, Loader2, Calendar, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [editData, setEditData] = useState(null)

  // Summary state
  const [summary, setSummary] = useState({
    total_income: 0,
    total_expense: 0,
    net_balance: 0,
    count: 0
  })

  // Date helpers
  const getCurrentMonthRange = () => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
    return { start: firstDay, end: lastDay }
  }

  // Pagination
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const LIMIT = 25

  // Filters
  const { start: defaultStart, end: defaultEnd } = getCurrentMonthRange()
  const [filters, setFilters] = useState({
    type: '',
    category_id: '',
    account_id: '',
    search: '',
    startDate: defaultStart,
    endDate: defaultEnd
  })

  // Reset pagination when filters change
  useEffect(() => {
    setPage(0)
    setHasMore(true)
    setTransactions([])
  }, [filters.type, filters.category_id, filters.account_id, filters.search, filters.startDate, filters.endDate])

  const fetchAll = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true)
    else setLoading(true)

    try {
      const params = {
        limit: LIMIT,
        offset: isLoadMore ? (page + 1) * LIMIT : 0
      }
      if (filters.type) params.type = filters.type
      if (filters.category_id) params.category_id = filters.category_id
      if (filters.account_id) params.account_id = filters.account_id
      if (filters.search) params.search = filters.search
      if (filters.startDate) params.start_date = filters.startDate
      if (filters.endDate) params.end_date = filters.endDate
      
      const [txns, cats, accs, summ] = await Promise.all([
        transactionsApi.getAll(params),
        isLoadMore ? Promise.resolve([]) : categoriesApi.getAll(),
        isLoadMore ? Promise.resolve([]) : accountsApi.getAll(),
        isLoadMore ? Promise.resolve(null) : transactionsApi.getSummary(params)
      ])

      if (isLoadMore) {
        setTransactions(prev => [...prev, ...txns])
        setPage(prev => prev + 1)
      } else {
        setTransactions(txns)
        setCategories(cats)
        setAccounts(accs)
        if (summ) setSummary(summ)
      }

      if (txns.length < LIMIT) setHasMore(false)
      else setHasMore(true)

    } catch (err) {
      console.error(err)
      toast.error('Failed to load transactions')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [filters.type, filters.category_id, filters.account_id, filters.search, filters.startDate, filters.endDate, page])

  useEffect(() => { 
    if (page === 0) fetchAll() 
  }, [page, fetchAll])

  // Infinite scroll observer
  const observer = useRef()
  const bottomRef = useCallback(node => {
    if (loading || loadingMore) return
    if (observer.current) observer.current.disconnect()
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        fetchAll(true)
      }
    }, {
      rootMargin: '200px',
      threshold: 0.1
    })
    
    if (node) observer.current.observe(node)
  }, [loading, loadingMore, hasMore, fetchAll])

  const handleDelete = async (id) => {
    if (!confirm('Delete this transaction?')) return
    try {
      await transactionsApi.delete(id)
      toast.success('Transaction deleted')
      setPage(0) 
      fetchAll()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleEdit = (txn) => {
    setEditData(txn)
    setFormOpen(true)
  }

  const setAllTime = () => {
    setFilters(p => ({ ...p, startDate: '', endDate: '' }))
  }

  const setCurrentMonth = () => {
    const { start, end } = getCurrentMonthRange()
    setFilters(p => ({ ...p, startDate: start, endDate: end }))
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--text)' }}>Transactions</h1>
        <div className="flex-1" />
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={setCurrentMonth}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              filters.startDate === defaultStart ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-[var(--card)] text-[var(--text-muted)] hover:bg-[var(--border)]'
            }`}
          >
            Current Month
          </button>
          <button
            onClick={setAllTime}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              !filters.startDate && !filters.endDate ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-[var(--card)] text-[var(--text-muted)] hover:bg-[var(--border)]'
            }`}
          >
            All Time
          </button>
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-3 sm:p-4 text-center flex flex-col items-center justify-center gap-1">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Transactions</p>
          <p className="font-bold text-lg" style={{ color: 'var(--text)' }}>{summary.count}</p>
        </div>
        <div className="card p-3 sm:p-4 text-center flex flex-col items-center justify-center gap-1">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Income</p>
          <p className="font-bold text-lg text-emerald-500">{formatCurrency(summary.total_income)}</p>
        </div>
        <div className="card p-3 sm:p-4 text-center flex flex-col items-center justify-center gap-1">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Expense</p>
          <p className="font-bold text-lg text-red-500">{formatCurrency(summary.total_expense)}</p>
        </div>
        <div className="card p-3 sm:p-4 text-center flex flex-col items-center justify-center gap-1">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Net Balance</p>
          <p className={`font-bold text-lg ${summary.net_balance >= 0 ? 'text-indigo-400' : 'text-orange-400'}`}>
            {formatCurrency(summary.net_balance)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search notes..."
              value={filters.search}
              onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
              className="input pl-8"
            />
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-1">
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-40" />
              <input
                type="date"
                value={filters.startDate}
                onChange={e => setFilters(p => ({ ...p, startDate: e.target.value }))}
                className="input pl-8 text-xs"
              />
            </div>
            <span className="text-xs opacity-40">to</span>
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-40" />
              <input
                type="date"
                value={filters.endDate}
                onChange={e => setFilters(p => ({ ...p, endDate: e.target.value }))}
                className="input pl-8 text-xs"
              />
            </div>
          </div>

          {/* Type & Account */}
          <div className="grid grid-cols-2 gap-3 sm:col-span-2 lg:col-span-2">
            <select
              value={filters.type}
              onChange={e => setFilters(p => ({ ...p, type: e.target.value }))}
              className="select"
            >
              <option value="">All Types</option>
              <option value="income">Income Only</option>
              <option value="expense">Expense Only</option>
            </select>
            <select
              value={filters.account_id}
              onChange={e => setFilters(p => ({ ...p, account_id: e.target.value }))}
              className="select"
            >
              <option value="">All Accounts</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setFilters(p => ({ ...p, category_id: '' }))}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
              !filters.category_id ? 'bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/30' : 'bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            All Categories
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setFilters(p => ({ ...p, category_id: c.id }))}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                filters.category_id === c.id ? 'bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/30' : 'bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {c.name}
            </button>
          ))}
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
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
            <p className="text-4xl mb-3">📭</p>
            <p className="font-medium">No transactions found</p>
            <p className="text-sm mt-1">Try changing your filters or add a new transaction</p>
            {(filters.startDate || filters.endDate) && (
              <button onClick={setAllTime} className="mt-4 text-xs font-bold text-indigo-500 underline underline-offset-4">
                Clear Date Filter
              </button>
            )}
          </div>
        ) : (
          <div style={{ borderTop: '1px solid var(--border)' }}>
            {/* Table header */}
            <div
              className="hidden md:grid items-center gap-0 px-5 py-3 text-[10px] font-bold uppercase tracking-widest"
              style={{
                gridTemplateColumns: '40px 1fr 130px 110px 110px 72px',
                background: 'rgba(51,65,85,0.05)',
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

            {transactions.map((txn) => (
              <div
                key={txn.id}
                className="hidden md:grid items-center px-5 py-3 transition-colors group"
                style={{
                  gridTemplateColumns: '40px 1fr 130px 110px 110px 72px',
                  borderBottom: '1px solid var(--border)'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,65,85,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ background: txn.type === 'income' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)' }}
                >
                  {txn.type === 'income'
                    ? <ArrowUpRight className="w-4 h-4" style={{ color: '#22C55E' }} />
                    : <ArrowDownLeft className="w-4 h-4" style={{ color: '#EF4444' }} />
                  }
                </div>

                {/* Details */}
                <div className="min-w-0 pl-3 flex flex-col justify-center">
                  <p className="text-sm font-medium line-clamp-1 break-words" style={{ color: 'var(--text)' }}>
                    {txn.notes || txn.category?.name}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${txn.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-400'}`}>
                      {txn.category?.name}
                    </span>
                  </div>
                </div>

                {/* Account */}
                <span
                  className="text-[10px] font-bold px-2 py-1 rounded-lg w-fit border border-[var(--border)]"
                  style={{ color: 'var(--text-muted)', background: 'var(--bg)' }}
                >
                  {txn.account?.name}
                </span>

                {/* Date */}
                <span className="text-[11px] font-medium whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                  {formatDate(txn.date)}
                </span>

                {/* Amount */}
                <span
                  className="font-mono font-bold text-sm whitespace-nowrap text-right"
                  style={{ color: txn.type === 'income' ? '#22C55E' : '#EF4444' }}
                >
                  {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                </span>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => handleEdit(txn)}
                    className="p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.color = 'var(--primary)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(txn.id)}
                    className="p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#EF4444' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Mobile rows (stacked layout) */}
            {transactions.map((txn) => (
              <div
                key={`m-${txn.id}`}
                className="flex md:hidden items-center gap-3 px-4 py-3 transition-colors border-b border-[var(--border)] last:border-0"
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,65,85,0.15)'}
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
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${txn.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-400'}`}>
                      {txn.category?.name}
                    </span>
                    <span className="text-[10px] opacity-40 uppercase font-bold tracking-widest">
                      • {txn.account?.name}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-mono font-bold text-sm" style={{ color: txn.type === 'income' ? '#22C55E' : '#EF4444' }}>
                    {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(txn)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(txn.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Infinite scroll sensor */}
            {(hasMore || loadingMore) && (
              <div ref={bottomRef} className="h-12 flex items-center justify-center">
                {loadingMore && <Loader2 className="animate-spin w-5 h-5 opacity-50" />}
              </div>
            )}
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
        transactions={transactions}
      />
    </div>
  )
}
