import { useState, useEffect, useCallback, useRef } from 'react'
import { transactionsApi, categoriesApi, accountsApi } from '../../api/client'
import { formatCurrency, formatDate } from '../../utils/helpers'
import TransactionForm from './TransactionForm'
import ExportModal from './ExportModal'
import { Plus, Pencil, Trash2, Filter, Search, ArrowUpRight, ArrowDownLeft, Download, Loader2, Calendar as CalendarIcon, X, ChevronRight, Tag, ChevronLeft, Wallet, Layers } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday, isYesterday, parseISO, isSameDay, addMonths, subMonths } from 'date-fns'

const ICON_EMOJI_MAP = {
  tag: '🏷️', utensils: '🍽️', car: '🚗', 'shopping-bag': '🛍️', zap: '⚡', film: '🎬',
  heart: '❤️', droplet: '💧', cpu: '💻', book: '📚', gamepad: '🎮', 'map-pin': '📍',
  'shopping-cart': '🛒', shirt: '👕', home: '🏠', briefcase: '💼', laptop: '💻',
  building: '🏢', 'trending-up': '📈', gift: '🎁', 'refresh-cw': '🔄', 'plus-circle': '➕',
  star: '⭐', music: '🎵', coffee: '☕', phone: '📱', globe: '🌍', bus: '🚌',
  train: '🚂', plane: '✈️',
}

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
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const getTruncatedText = (text) => {
    const str = text || 'Untitled'
    let limit = 35 // Laptop default
    if (windowWidth < 768) limit = 15 // Mobile
    else if (windowWidth < 1280) limit = 20 // iPad/Tablet
    return str.length > limit ? str.substring(0, limit) + '....' : str
  }

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

  // Grouping transactions by date
  const grouped = {}
  transactions.forEach(txn => {
    const dStr = txn.date ? txn.date.split('T')[0] : 'No Date'
    if (!grouped[dStr]) grouped[dStr] = []
    grouped[dStr].push(txn)
  })
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  const getDateHeader = (dateStr) => {
    if (dateStr === 'No Date') return 'No Date'
    try {
      const d = parseISO(dateStr)
      if (isToday(d)) return 'Today'
      if (isYesterday(d)) return 'Yesterday'
      return format(d, 'EEEE, d MMMM yyyy')
    } catch (e) {
      return dateStr
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="w-full sm:w-auto">
          <div className="p-1 bg-[var(--card)] rounded-xl border border-[var(--border)] flex items-center shadow-sm w-full sm:w-auto">
            <button
              onClick={setCurrentMonth}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all ${
                filters.startDate === defaultStart 
                  ? 'bg-[var(--primary)] text-white shadow-lg shadow-indigo-500/20' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/5'
              }`}
            >
              Current Month
            </button>
            <button
              onClick={setAllTime}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all ${
                !filters.startDate && !filters.endDate 
                  ? 'bg-[var(--primary)] text-white shadow-lg shadow-indigo-500/20' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/5'
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Transactions', value: summary.count, color: 'var(--text)' },
          { label: 'Income', value: formatCurrency(summary.total_income), color: '#10B981' },
          { label: 'Expense', value: formatCurrency(summary.total_expense), color: '#EF4444' },
          { 
            label: 'Net Balance', 
            value: formatCurrency(summary.net_balance), 
            color: summary.net_balance >= 0 ? 'var(--primary)' : '#EF4444' 
          }
        ].map((item, idx) => (
          <div key={idx} className="card p-4 sm:p-5 flex flex-col items-center justify-center gap-1 group transition-all hover:bg-[var(--bg)]/30 border-[var(--border)] shadow-sm overflow-hidden">
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
      <div className="card p-4 shadow-sm border-[var(--border)] overflow-visible relative z-30">
        <div className="flex flex-col xl:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-0 xl:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] opacity-40 pointer-events-none" />
            <input
              type="text"
              placeholder="Search history..."
              value={filters.search}
              onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
              className="input pl-10 h-11 text-sm font-medium w-full"
            />
          </div>

          {/* Time & Filters Group */}
          <div className="flex flex-col md:flex-row gap-3 flex-1">
            {/* Date Range Picker */}
            <div className="relative flex items-center p-1 bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm min-w-[280px]">
              <button
                onClick={() => setActivePicker('start')}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/5 rounded-lg transition-all"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" />
                {filters.startDate ? format(parseISO(filters.startDate), 'dd MMM yyyy') : 'Start Date'}
              </button>
              <div className="w-px h-4 bg-[var(--border)] opacity-30" />
              <button
                onClick={() => setActivePicker('end')}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/5 rounded-lg transition-all"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" />
                {filters.endDate ? format(parseISO(filters.endDate), 'dd MMM yyyy') : 'End Date'}
              </button>

              <AnimatePresence>
                {activePicker && (
                  <CalendarPopover
                    label={activePicker === 'start' ? 'Start Date' : 'End Date'}
                    value={activePicker === 'start' ? filters.startDate : filters.endDate}
                    onChange={(date) => setFilters(p => ({ 
                      ...p, 
                      [activePicker === 'start' ? 'startDate' : 'endDate']: date 
                    }))}
                    onClose={() => setActivePicker(null)}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Dropdowns */}
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1">
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
              
              <div className="relative flex-1">
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

              <div className="relative flex-1">
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
      </div>

      {/* Transactions List */}
      <div className="space-y-6">
        {loading ? (
          <div className="card p-12 flex flex-col items-center justify-center gap-4 opacity-50">
            <Loader2 className="w-10 h-10 animate-spin text-[var(--primary)]" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Gathering records...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="card py-20 text-center flex flex-col items-center justify-center gap-4">
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
          <div className="space-y-6">
            {sortedDates.map((dateKey) => {
              const dateTxns = grouped[dateKey]
              return (
                <div key={dateKey} className="space-y-2">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-[11px] font-bold tracking-wider text-[var(--text-muted)] uppercase">
                      {getDateHeader(dateKey)}
                    </h3>
                    <span className="text-[9px] font-medium text-[var(--text-muted)]/70 uppercase tracking-widest">
                      {dateTxns.length} {dateTxns.length === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>
                  <div className="card overflow-hidden divide-y divide-[var(--border)] shadow-sm border-[var(--border)]">
                    {dateTxns.map((txn) => {
                      const categoryColor = txn.category?.color || '#6366f1'
                      const isIncome = txn.type === 'income'
                      const emoji = ICON_EMOJI_MAP[txn.category?.icon] || txn.category?.icon || '🏷️'
                      
                      return (
                        <div
                          key={txn.id}
                          className="flex items-center px-4 sm:px-6 py-3.5 group hover:bg-[var(--bg)]/40 transition-all cursor-pointer relative"
                          onClick={() => handleEdit(txn)}
                        >
                          {/* Left: Category Icon with custom colored background glow */}
                          <div className="flex-shrink-0 mr-3.5">
                            <div 
                              className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg transition-transform group-hover:scale-105"
                              style={{ 
                                background: `${categoryColor}18`, 
                                border: `1px solid ${categoryColor}30` 
                              }}
                            >
                              {emoji}
                            </div>
                          </div>

                          {/* Info Column */}
                          <div className="flex-1 min-w-0 pr-2">
                            <p className="font-semibold text-sm text-[var(--text)] group-hover:text-[var(--primary)] transition-colors truncate">
                              {txn.notes || txn.category?.name || 'Untitled'}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                                {txn.category?.name || 'Uncategorized'}
                              </span>
                              <span className="text-[10px] text-[var(--text-muted)]/40">•</span>
                              <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                                {txn.account?.name || 'Default Account'}
                              </span>
                            </div>
                          </div>

                          {/* Right Column: Amount, Action buttons */}
                          <div className="text-right flex items-center gap-4 flex-shrink-0">
                            <span className={`font-bold text-sm sm:text-base whitespace-nowrap ${
                              isIncome ? 'text-emerald-500' : 'text-red-500'
                            }`}>
                              {isIncome ? '+' : '-'}{formatCurrency(txn.amount)}
                            </span>
                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEdit(txn) }}
                                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--bg)] transition-all"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(txn.id) }}
                                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            
            {/* Load More Sensor */}
            {(hasMore || loadingMore) && (
              <div ref={bottomRef} className="h-20 flex items-center justify-center bg-[var(--bg)]/10 rounded-2xl border border-dashed border-[var(--border)]">
                {loadingMore ? (
                  <div className="flex items-center gap-2 text-[var(--primary)]">
                    <Loader2 className="animate-spin w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Syncing Records...</span>
                  </div>
                ) : (
                  <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-[var(--text-muted)] opacity-30">
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
