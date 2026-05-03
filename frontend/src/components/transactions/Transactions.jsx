import { useState, useEffect, useCallback, useRef } from 'react'
import { transactionsApi, categoriesApi, accountsApi } from '../../api/client'
import { formatCurrency, formatDate } from '../../utils/helpers'
import TransactionForm from './TransactionForm'
import ExportModal from './ExportModal'
import { Plus, Pencil, Trash2, Filter, Search, ArrowUpRight, ArrowDownLeft, Download, Loader2, Calendar, X, ChevronRight, Tag } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [editData, setEditData] = useState(null)

  // Refs for calendar triggers
  const startPickerRef = useRef(null)
  const endPickerRef = useRef(null)

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

  const openPicker = (ref) => {
    if (ref.current) {
      try {
        ref.current.showPicker()
      } catch (e) {
        ref.current.focus()
      }
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-[var(--bg)] rounded-xl border border-[var(--border)] flex items-center gap-1 shadow-sm">
            <button
              onClick={setCurrentMonth}
              className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                filters.startDate === defaultStart ? 'bg-indigo-500 text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              Current Month
            </button>
            <button
              onClick={setAllTime}
              className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                !filters.startDate && !filters.endDate ? 'bg-indigo-500 text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              All Time
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setExportModalOpen(true)}
            className="btn-secondary px-4 h-11 flex items-center gap-2 border-[var(--border)] shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Export</span>
          </button>
          <button
            onClick={() => { setEditData(null); setFormOpen(true) }}
            className="btn-primary px-5 h-11 flex items-center gap-2 shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Add New</span>
          </button>
        </div>
      </div>

      {/* Summary Stats */}
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
          <div key={idx} className="card p-5 flex flex-col items-center justify-center gap-1 group transition-all hover:bg-[var(--bg)]/30 border-[var(--border)] shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-60">{item.label}</p>
            <p className="font-bold text-xl" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Unified Filter Section */}
      <div className="card p-4 shadow-sm border-[var(--border)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
          
          {/* Search Field */}
          <div className="lg:col-span-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] opacity-50" />
            <input
              type="text"
              placeholder="Search history..."
              value={filters.search}
              onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
              className="input pl-10 h-11 text-xs font-medium"
            />
          </div>

          {/* Custom Themed Date Range Pickers */}
          <div className="lg:col-span-4 flex items-center gap-1 bg-[var(--bg)] p-1 rounded-xl border border-[var(--border)] shadow-inner">
            <div 
              className="flex-1 relative group cursor-pointer"
              onClick={() => openPicker(startPickerRef)}
            >
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-400 opacity-60 group-hover:opacity-100 transition-opacity" />
              <input
                ref={startPickerRef}
                type="date"
                value={filters.startDate}
                onChange={e => setFilters(p => ({ ...p, startDate: e.target.value }))}
                className="bg-transparent text-[11px] font-bold w-full h-9 pl-9 outline-none cursor-pointer hover:text-indigo-400 transition-colors"
                style={{ color: 'var(--text)' }}
              />
            </div>
            <div className="h-4 w-[1px] bg-[var(--border)] mx-1" />
            <div 
              className="flex-1 relative group cursor-pointer"
              onClick={() => openPicker(endPickerRef)}
            >
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-400 opacity-60 group-hover:opacity-100 transition-opacity" />
              <input
                ref={endPickerRef}
                type="date"
                value={filters.endDate}
                onChange={e => setFilters(p => ({ ...p, endDate: e.target.value }))}
                className="bg-transparent text-[11px] font-bold w-full h-9 pl-9 outline-none cursor-pointer hover:text-indigo-400 transition-colors"
                style={{ color: 'var(--text)' }}
              />
            </div>
          </div>

          {/* Select Dropdowns */}
          <div className="lg:col-span-5 grid grid-cols-3 gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] opacity-40 pointer-events-none" />
              <select
                value={filters.type}
                onChange={e => setFilters(p => ({ ...p, type: e.target.value }))}
                className="select pl-9 h-11 text-[11px] font-bold uppercase tracking-wider"
              >
                <option value="">Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] opacity-40 pointer-events-none" />
              <select
                value={filters.category_id}
                onChange={e => setFilters(p => ({ ...p, category_id: e.target.value }))}
                className="select pl-9 h-11 text-[11px] font-bold uppercase tracking-wider"
              >
                <option value="">Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="relative">
              <Download className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] opacity-40 pointer-events-none" />
              <select
                value={filters.account_id}
                onChange={e => setFilters(p => ({ ...p, account_id: e.target.value }))}
                className="select pl-9 h-11 text-[11px] font-bold uppercase tracking-wider"
              >
                <option value="">Accounts</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

        </div>
      </div>

      {/* Transactions Table Card */}
      <div className="card overflow-hidden shadow-sm border-[var(--border)]">
        {loading ? (
          <div className="p-10 flex flex-col items-center justify-center gap-4 opacity-50">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-[10px] font-bold uppercase tracking-widest">Gathering records...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-24 text-center flex flex-col items-center justify-center gap-4">
            <div className="w-20 h-20 rounded-full bg-[var(--bg)] flex items-center justify-center text-4xl shadow-inner">🔍</div>
            <div className="space-y-1">
              <p className="font-bold text-lg">No matches found</p>
              <p className="text-xs text-[var(--text-muted)]">Try adjusting your filters or search terms</p>
            </div>
            <button onClick={setCurrentMonth} className="btn-secondary px-6 py-2 text-[10px] font-bold uppercase tracking-widest">
              Back to This Month
            </button>
          </div>
        ) : (
          <div>
            {/* Desktop View */}
            <div className="hidden md:block">
              <div className="grid grid-cols-12 px-6 py-4 bg-[var(--bg)]/40 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] border-b border-[var(--border)]">
                <div className="col-span-1 text-center">Type</div>
                <div className="col-span-5 pl-4">Description</div>
                <div className="col-span-2">Account</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-2 text-right pr-12">Amount</div>
              </div>

              <div className="divide-y divide-white/5">
                {transactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="grid grid-cols-12 items-center px-6 py-4 group hover:bg-[var(--bg)] transition-all cursor-pointer relative"
                    onClick={() => handleEdit(txn)}
                  >
                    {/* Icon */}
                    <div className="col-span-1 flex justify-center">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm transition-all group-hover:scale-110 ${
                        txn.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {txn.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="col-span-5 pl-4 flex flex-col">
                      <p className="font-bold text-sm text-[var(--text)] group-hover:text-indigo-400 transition-colors">
                        {txn.notes || txn.category?.name}
                      </p>
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-0.5 opacity-60">
                        {txn.category?.name}
                      </span>
                    </div>

                    {/* Account */}
                    <div className="col-span-2">
                      <span className="px-2.5 py-1 rounded-lg bg-[var(--border)]/20 text-[10px] font-bold text-[var(--text-muted)] border border-[var(--border)]/30">
                        {txn.account?.name}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="col-span-2 text-[11px] font-semibold text-[var(--text-muted)]">
                      {formatDate(txn.date)}
                    </div>

                    {/* Amount */}
                    <div className="col-span-2 flex items-center justify-end gap-4 pr-4">
                      <span className={`font-bold text-base ${
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
            </div>

            {/* Mobile View */}
            <div className="md:hidden divide-y divide-white/5">
              {transactions.map((txn) => (
                <div
                  key={`m-${txn.id}`}
                  className="p-4 flex items-center gap-4 hover:bg-[var(--bg)]"
                  onClick={() => handleEdit(txn)}
                >
                  <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-sm ${
                    txn.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {txn.type === 'income' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownLeft className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[var(--text)] truncate">{txn.notes || txn.category?.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{txn.category?.name}</span>
                      <span className="text-[10px] opacity-20">•</span>
                      <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">{txn.account?.name}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm" style={{ color: txn.type === 'income' ? '#10B981' : '#EF4444' }}>
                      {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1 font-semibold">{formatDate(txn.date)}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Load More Sensor */}
            {(hasMore || loadingMore) && (
              <div ref={bottomRef} className="h-20 flex items-center justify-center bg-[var(--bg)]/10">
                {loadingMore ? (
                  <div className="flex items-center gap-2 text-indigo-400">
                    <Loader2 className="animate-spin w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Loading Records...</span>
                  </div>
                ) : (
                  <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-[var(--text-muted)] opacity-20">
                    Scroll for more records
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <TransactionForm isOpen={formOpen} onClose={() => setFormOpen(false)} onSaved={fetchAll} editData={editData} />
      <ExportModal isOpen={exportModalOpen} onClose={() => setExportModalOpen(false)} transactions={transactions} />
    </motion.div>
  )
}
