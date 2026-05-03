import { useState, useEffect, useCallback, useRef } from 'react'
import { transactionsApi, categoriesApi, accountsApi } from '../../api/client'
import { formatCurrency, formatDate } from '../../utils/helpers'
import TransactionForm from './TransactionForm'
import ExportModal from './ExportModal'
import { Plus, Pencil, Trash2, Filter, Search, ArrowUpRight, ArrowDownLeft, Download, Loader2, Calendar as CalendarIcon, X, ChevronRight, Tag, ChevronLeft, Wallet, Layers } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday, parseISO, isSameDay, addMonths, subMonths } from 'date-fns'

// Custom Themed Calendar Popover
function CalendarPopover({ value, onChange, onClose, label }) {
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date())
  const containerRef = useRef(null)

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onClose])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute top-full mt-2 z-[100] bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl p-4 w-[280px]"
    >
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{label}</h4>
        <div className="flex items-center gap-1">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-[var(--bg)] rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold w-24 text-center">{format(currentMonth, 'MMMM yyyy')}</span>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-[var(--bg)] rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {weekDays.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-[var(--text-muted)] py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const isSelected = value && isSameDay(day, new Date(value))
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isTdy = isToday(day)

          return (
            <button
              key={i}
              onClick={() => {
                onChange(format(day, 'yyyy-MM-dd'))
                onClose()
              }}
              className={`h-8 flex items-center justify-center rounded-lg text-xs transition-all ${
                isSelected 
                  ? 'bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/30' 
                  : isCurrentMonth 
                    ? 'hover:bg-[var(--bg)] text-[var(--text)]' 
                    : 'text-[var(--text-muted)] opacity-30 hover:opacity-100'
              } ${isTdy && !isSelected ? 'border border-indigo-500/50' : ''}`}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between">
        <button 
          onClick={() => { onChange(format(new Date(), 'yyyy-MM-dd')); onClose() }}
          className="text-[10px] font-bold text-indigo-400 hover:underline uppercase tracking-wider"
        >
          Today
        </button>
        <button 
          onClick={() => { onChange(''); onClose() }}
          className="text-[10px] font-bold text-red-400 hover:underline uppercase tracking-wider"
        >
          Clear
        </button>
      </div>
    </motion.div>
  )
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [editData, setEditData] = useState(null)

  // Date Popover States
  const [activePicker, setActivePicker] = useState(null) // 'start' or 'end'

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

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setExportModalOpen(true)}
            className="btn-secondary flex-1 sm:flex-initial px-3 sm:px-4 h-11 flex items-center justify-center gap-2 border-[var(--border)] shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Export</span>
          </button>
          <button
            onClick={() => { setEditData(null); setFormOpen(true) }}
            className="btn-primary flex-1 sm:flex-initial px-4 sm:px-5 h-11 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap">Add Entry</span>
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
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
          <div key={idx} className="card p-3 sm:p-5 flex flex-col items-center justify-center gap-0.5 sm:gap-1 group transition-all hover:bg-[var(--bg)]/30 border-[var(--border)] shadow-sm overflow-hidden">
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-[var(--text-muted)] opacity-60 truncate w-full text-center">{item.label}</p>
            <p 
              className="font-bold text-base sm:text-xl truncate w-full text-center" 
              style={{ color: item.color }}
              title={item.value}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Unified Filter Section */}
      <div className="card p-4 shadow-sm border-[var(--border)] overflow-visible">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-center">
          
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

          {/* Custom THEMED Date Range Popovers */}
          <div className="lg:col-span-4 flex items-center gap-1 bg-[var(--bg)] p-1 rounded-xl border border-[var(--border)] shadow-inner relative">
            <div className="flex-1 relative">
              <button 
                onClick={() => setActivePicker(activePicker === 'start' ? null : 'start')}
                className={`flex items-center gap-3 w-full h-9 px-3 rounded-lg transition-all ${
                  activePicker === 'start' ? 'bg-[var(--card)] shadow-sm' : 'hover:bg-[var(--card)]/50'
                }`}
              >
                <CalendarIcon className="w-4 h-4 text-indigo-400" />
                <span className="text-[11px] font-bold truncate">
                  {filters.startDate ? format(new Date(filters.startDate), 'dd MMM yyyy') : 'Start Date'}
                </span>
              </button>
              <AnimatePresence>
                {activePicker === 'start' && (
                  <CalendarPopover 
                    label="From"
                    value={filters.startDate}
                    onChange={(d) => setFilters(p => ({ ...p, startDate: d }))}
                    onClose={() => setActivePicker(null)}
                  />
                )}
              </AnimatePresence>
            </div>

            <div className="h-4 w-[1px] bg-[var(--border)] opacity-50" />

            <div className="flex-1 relative">
              <button 
                onClick={() => setActivePicker(activePicker === 'end' ? null : 'end')}
                className={`flex items-center gap-3 w-full h-9 px-3 rounded-lg transition-all ${
                  activePicker === 'end' ? 'bg-[var(--card)] shadow-sm' : 'hover:bg-[var(--card)]/50'
                }`}
              >
                <CalendarIcon className="w-4 h-4 text-indigo-400" />
                <span className="text-[11px] font-bold truncate">
                  {filters.endDate ? format(new Date(filters.endDate), 'dd MMM yyyy') : 'End Date'}
                </span>
              </button>
              <AnimatePresence>
                {activePicker === 'end' && (
                  <CalendarPopover 
                    label="To"
                    value={filters.endDate}
                    onChange={(d) => setFilters(p => ({ ...p, endDate: d }))}
                    onClose={() => setActivePicker(null)}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Select Dropdowns */}
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <div className="relative">
              <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] opacity-40 pointer-events-none" />
              <select
                value={filters.type}
                onChange={e => setFilters(p => ({ ...p, type: e.target.value }))}
                className="select pl-9 h-11 text-[11px] font-bold uppercase tracking-wider w-full"
              >
                <option value="">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] opacity-40 pointer-events-none" />
              <select
                value={filters.category_id}
                onChange={e => setFilters(p => ({ ...p, category_id: e.target.value }))}
                className="select pl-9 h-11 text-[11px] font-bold uppercase tracking-wider w-full"
              >
                <option value="">Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="relative">
              <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] opacity-40 pointer-events-none" />
              <select
                value={filters.account_id}
                onChange={e => setFilters(p => ({ ...p, account_id: e.target.value }))}
                className="select pl-9 h-11 text-[11px] font-bold uppercase tracking-wider w-full"
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
          <div className="p-12 flex flex-col items-center justify-center gap-4 opacity-50">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
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

              <div className="divide-y divide-white/[0.03]">
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
                      <span className="px-2.5 py-1 rounded-lg bg-[var(--border)]/10 text-[10px] font-bold text-[var(--text-muted)] border border-[var(--border)]/20">
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

            <div className="md:hidden divide-y divide-white/[0.03]">
              {transactions.map((txn) => (
                <div
                  key={`m-${txn.id}`}
                  className="px-3 py-4 flex items-center gap-2 hover:bg-[var(--bg)] active:bg-[var(--bg)] transition-colors overflow-hidden"
                  onClick={() => handleEdit(txn)}
                >
                  <div className={`w-11 h-11 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-sm ${
                    txn.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {txn.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-bold text-[13px] text-[var(--text)] leading-tight">
                      {(() => {
                        const note = txn.notes || txn.category?.name || 'Untitled';
                        return note.length > 15 ? note.substring(0, 15) + '....' : note;
                      })()}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider truncate max-w-[70px]">
                        {txn.category?.name}
                      </span>
                      <span className="text-[9px] opacity-20">•</span>
                      <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-wider truncate max-w-[70px]">
                        {txn.account?.name}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 min-w-[85px]">
                    <p className="font-bold text-[14px]" style={{ color: txn.type === 'income' ? '#10B981' : '#EF4444' }}>
                      {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                    </p>
                    <p className="text-[9px] text-[var(--text-muted)] mt-0.5 font-semibold">
                      {formatDate(txn.date)}
                    </p>
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
                    <span className="text-[10px] font-bold uppercase tracking-widest">Syncing Records...</span>
                  </div>
                ) : (
                  <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-[var(--text-muted)] opacity-10">
                    Scroll for more
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
