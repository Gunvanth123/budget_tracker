import { useState, useEffect, useCallback, useRef } from 'react'
import { transactionsApi, categoriesApi, accountsApi } from '../../api/client'
import { formatCurrency, formatDate } from '../../utils/helpers'
import TransactionForm from './TransactionForm'
import ExportModal from './ExportModal'
import { Plus, Pencil, Trash2, Filter, Search, ArrowUpRight, ArrowDownLeft, Download, Loader2, Calendar, X, ChevronRight } from 'lucide-react'
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
    <div className="space-y-6">
      {/* Action Bar (No H1) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Quick Presets */}
        <div className="flex items-center gap-2">
          <div className="p-1 bg-[var(--bg)] rounded-xl border border-[var(--border)] flex items-center gap-1">
            <button
              onClick={setCurrentMonth}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                filters.startDate === defaultStart ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              Current Month
            </button>
            <button
              onClick={setAllTime}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                !filters.startDate && !filters.endDate ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              All Time
            </button>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setExportModalOpen(true)}
            className="btn-secondary px-4 h-10 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={() => { setEditData(null); setFormOpen(true) }}
            className="btn-primary px-5 h-10 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Transactions', value: summary.count, color: 'var(--text)' },
          { label: 'Income', value: formatCurrency(summary.total_income), color: '#10B981' },
          { label: 'Expense', value: formatCurrency(summary.total_expense), color: '#EF4444' },
          { 
            label: 'Net Balance', 
            value: formatCurrency(summary.net_balance), 
            color: summary.net_balance >= 0 ? '#6366F1' : '#F59E0B' 
          }
        ].map((item, idx) => (
          <div key={idx} className="card p-4 flex flex-col items-center justify-center gap-1.5 group transition-all hover:scale-[1.02]">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
            <p className="font-bold text-xl font-display" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Optimized Filters Card */}
      <div className="card overflow-visible">
        <div className="p-4 border-b border-[var(--border)]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* Search */}
            <div className="lg:col-span-3 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
              <input
                type="text"
                placeholder="Search history..."
                value={filters.search}
                onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
                className="input pl-10 w-full h-11"
              />
            </div>

            {/* Date Range Container */}
            <div className="lg:col-span-4 flex items-center gap-2 bg-[var(--bg)] p-1 rounded-xl border border-[var(--border)]">
              <div className="flex-1 relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-30" />
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={e => setFilters(p => ({ ...p, startDate: e.target.value }))}
                  className="bg-transparent text-[11px] font-medium w-full h-9 pl-9 pr-2 outline-none"
                  style={{ color: 'var(--text)' }}
                />
              </div>
              <ChevronRight className="w-3 h-3 opacity-20" />
              <div className="flex-1 relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-30" />
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={e => setFilters(p => ({ ...p, endDate: e.target.value }))}
                  className="bg-transparent text-[11px] font-medium w-full h-9 pl-9 pr-2 outline-none"
                  style={{ color: 'var(--text)' }}
                />
              </div>
            </div>

            {/* Selects */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-3">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-30" />
                <select
                  value={filters.type}
                  onChange={e => setFilters(p => ({ ...p, type: e.target.value }))}
                  className="select pl-9 h-11 text-xs"
                >
                  <option value="">All Types</option>
                  <option value="income">Income Only</option>
                  <option value="expense">Expense Only</option>
                </select>
              </div>
              <div className="relative">
                <Trash2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-30" />
                <select
                  value={filters.account_id}
                  onChange={e => setFilters(p => ({ ...p, account_id: e.target.value }))}
                  className="select pl-9 h-11 text-xs"
                >
                  <option value="">All Accounts</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Category horizontal scroll */}
        <div className="px-4 py-3 bg-[var(--bg)]/50 overflow-x-auto flex items-center gap-2 no-scrollbar">
          <button
            onClick={() => setFilters(p => ({ ...p, category_id: '' }))}
            className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
              !filters.category_id 
                ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                : 'bg-[var(--card)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            All Categories
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setFilters(p => ({ ...p, category_id: c.id }))}
              className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                filters.category_id === c.id 
                  ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                  : 'bg-[var(--card)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List Card */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-12 h-12 rounded-2xl bg-[var(--border)] opacity-50" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 bg-[var(--border)] rounded opacity-50" />
                  <div className="h-3 w-1/4 bg-[var(--border)] rounded opacity-50" />
                </div>
                <div className="h-5 w-20 bg-[var(--border)] rounded opacity-50" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[var(--bg)] flex items-center justify-center text-3xl">📭</div>
            <div>
              <p className="font-bold text-lg text-[var(--text)]">No results found</p>
              <p className="text-sm text-[var(--text-muted)]">Try adjusting your filters or search query</p>
            </div>
            <button onClick={setCurrentMonth} className="text-xs font-bold text-indigo-500 uppercase tracking-widest hover:underline decoration-2 underline-offset-8">
              Reset to Current Month
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {/* Desktop Table */}
            <div className="hidden md:block">
              <div className="grid grid-cols-12 px-6 py-4 bg-[var(--bg)]/50 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                <div className="col-span-1">Type</div>
                <div className="col-span-5 pl-4">Details</div>
                <div className="col-span-2">Account</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>

              {transactions.map((txn) => (
                <div
                  key={txn.id}
                  className="grid grid-cols-12 items-center px-6 py-4 group hover:bg-[var(--bg)] transition-all cursor-default"
                  onClick={() => handleEdit(txn)}
                >
                  {/* Type Icon */}
                  <div className="col-span-1">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 ${
                      txn.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                    }`}>
                      {txn.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="col-span-5 pl-4 flex flex-col gap-0.5">
                    <p className="font-bold text-sm text-[var(--text)] group-hover:text-indigo-400 transition-colors">
                      {txn.notes || txn.category?.name}
                    </p>
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      {txn.category?.name}
                    </span>
                  </div>

                  {/* Account */}
                  <div className="col-span-2">
                    <span className="px-2.5 py-1 rounded-lg bg-[var(--border)]/50 text-[10px] font-bold text-[var(--text-muted)]">
                      {txn.account?.name}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="col-span-2 text-[11px] font-medium text-[var(--text-muted)]">
                    {formatDate(txn.date)}
                  </div>

                  {/* Amount & Quick Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-4">
                    <span className={`font-mono font-bold text-base ${
                      txn.type === 'income' ? 'text-emerald-500' : 'text-red-500'
                    }`}>
                      {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(txn.id) }}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile View */}
            <div className="md:hidden">
              {transactions.map((txn) => (
                <div
                  key={`m-${txn.id}`}
                  className="p-4 flex items-center gap-4 hover:bg-[var(--bg)] transition-all"
                  onClick={() => handleEdit(txn)}
                >
                  <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center ${
                    txn.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {txn.type === 'income' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownLeft className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[var(--text)] truncate">{txn.notes || txn.category?.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{txn.category?.name}</span>
                      <span className="text-[10px] text-[var(--text-muted)] opacity-50">•</span>
                      <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">{txn.account?.name}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono font-bold ${txn.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">{formatDate(txn.date)}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Infinite scroll sensor */}
            {(hasMore || loadingMore) && (
              <div ref={bottomRef} className="h-16 flex items-center justify-center bg-[var(--bg)]/20">
                {loadingMore ? (
                  <Loader2 className="animate-spin w-6 h-6 text-indigo-500" />
                ) : (
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-30">
                    Scroll for more
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
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
