import { useState, useEffect } from 'react'
import { categoriesApi, budgetsApi, dashboardApi, usageApi } from '../../api/client'
import { formatCurrency } from '../../utils/helpers'
import toast from 'react-hot-toast'
import { Target, AlertTriangle, CheckCircle, Plus, Sparkles, Flame, Percent } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const ICON_EMOJI_MAP = {
  tag: '🏷️', utensils: '🍽️', car: '🚗', 'shopping-bag': '🛍️', zap: '⚡', film: '🎬',
  heart: '❤️', droplet: '💧', cpu: '💻', book: '📚', gamepad: '🎮', 'map-pin': '📍',
  'shopping-cart': '🛒', shirt: '👕', home: '🏠', briefcase: '💼', laptop: '💻',
  building: '🏢', 'trending-up': '📈', gift: '🎁', 'refresh-cw': '🔄', 'plus-circle': '➕',
  star: '⭐', music: '🎵', coffee: '☕', phone: '📱', globe: '🌍', bus: '🚌',
  train: '🚂', plane: '✈️',
}

export default function BudgetGoals() {
  const [categories, setCategories] = useState([])
  const [budgets, setBudgets] = useState([])
  const [expenses, setExpenses] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('active') // 'active' | 'completed'

  const currentMonthStr = new Date().toISOString().slice(0, 7) // "YYYY-MM"
  const formattedMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const fetchData = async () => {
    try {
      const [catsRes, budgetsRes, dashboardRes] = await Promise.all([
        categoriesApi.getAll(),
        budgetsApi.getAll(currentMonthStr),
        dashboardApi.get(currentMonthStr)
      ])
      
      const expCats = catsRes.filter(c => c.type === 'expense')
      setCategories(expCats)
      setBudgets(budgetsRes)

      const expMap = {}
      dashboardRes.expense_by_category?.forEach(item => {
        expMap[item.category.toLowerCase().trim()] = item.amount
      })
      setExpenses(expMap)
    } catch {
      toast.error('Failed to load budget data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    usageApi.track('budgets')
  }, [])

  // Sync listener when transactions are added or updated elsewhere
  useEffect(() => {
    const handleSync = () => {
      fetchData()
    }
    window.addEventListener('transaction-saved', handleSync)
    return () => window.removeEventListener('transaction-saved', handleSync)
  }, [])

  const handleBudgetChange = async (catId, value) => {
    const amount = parseFloat(value) || 0
    try {
      await budgetsApi.set({
        category_id: catId,
        amount: amount,
        month_year: currentMonthStr
      })
      toast.success('Budget limit updated')
      fetchData() // refresh data
    } catch {
      toast.error('Failed to update limit')
    }
  }

  // Calculate totals for summary card
  let totalBudgeted = 0
  let totalSpentInBudgets = 0

  categories.forEach(cat => {
    const budget = budgets.find(b => b.category_id === cat.id)
    const limit = budget ? budget.amount : 0
    const spent = expenses[cat.name.toLowerCase().trim()] || 0
    totalBudgeted += limit
    totalSpentInBudgets += spent
  })

  // Partition budgets
  const activeBudgets = []
  const completedBudgets = [] // fully spent or exceeded

  categories.forEach(cat => {
    const budget = budgets.find(b => b.category_id === cat.id)
    const limit = budget ? budget.amount : 0
    const spent = expenses[cat.name.toLowerCase().trim()] || 0
    const item = { ...cat, limit, spent }
    
    if (limit > 0 && spent >= limit) {
      completedBudgets.push(item)
    } else {
      activeBudgets.push(item)
    }
  })

  const currentList = activeTab === 'active' ? activeBudgets : completedBudgets

  if (loading) {
    return (
      <div className="card p-12 text-center shadow-sm border-[var(--border)] opacity-60">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)] mx-auto mb-4" />
        <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-bold">Analyzing budgets...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Premium Card */}
      <div className="card p-6 bg-gradient-to-br from-indigo-500/80 via-blue-500/80 to-indigo-600/90 text-white shadow-xl relative overflow-hidden border-none">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold tracking-wide flex items-center gap-2">
              <Target className="w-5.5 h-5.5" /> Budget Planning
            </h2>
            <p className="text-xs opacity-90 font-medium">
              Category spending limits for <span className="font-bold underline">{formattedMonth}</span>
            </p>
          </div>
          <div className="flex gap-4">
            <div className="text-left sm:text-right">
              <p className="text-[9px] uppercase tracking-wider font-bold opacity-75">Total Budgeted</p>
              <p className="text-lg font-bold">{formatCurrency(totalBudgeted)}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-[9px] uppercase tracking-wider font-bold opacity-75">Spent Total</p>
              <p className="text-lg font-bold">{formatCurrency(totalSpentInBudgets)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="p-1 bg-[var(--card)] rounded-2xl border border-[var(--border)] flex shadow-sm">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'active'
                ? 'bg-[var(--primary)] text-white shadow-lg shadow-indigo-500/20'
                : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/5'
            }`}
          >
            Active ({activeBudgets.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'completed'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/5'
            }`}
          >
            Completed ({completedBudgets.length})
          </button>
        </div>
      </div>

      {/* Budget Grid */}
      {currentList.length === 0 ? (
        <div className="card p-16 text-center border-[var(--border)] shadow-sm">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)] opacity-35" />
          <h3 className="font-bold text-lg">No budgets here</h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {activeTab === 'active' ? 'You have fully spent all budgets!' : 'No budgets have been fully spent yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentList.map(cat => {
            const emoji = ICON_EMOJI_MAP[cat.icon] || cat.icon || '🏷️'
            const categoryColor = cat.color || '#6366f1'
            const percentage = cat.limit > 0 ? Math.min((cat.spent / cat.limit) * 100, 100) : 0
            const hasExceeded = cat.limit > 0 && cat.spent >= cat.limit
            const remaining = cat.limit > 0 ? Math.max(cat.limit - cat.spent, 0) : 0

            return (
              <div 
                key={cat.id} 
                className="card p-5 space-y-4 hover:shadow-md transition-all border-[var(--border)] shadow-sm relative overflow-hidden"
              >
                {/* Visual Glow Indicator */}
                {hasExceeded && (
                  <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
                )}

                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl"
                      style={{ 
                        background: `${categoryColor}18`, 
                        border: `1.5px solid ${categoryColor}30` 
                      }}
                    >
                      {emoji}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[var(--text)]">{cat.name}</h3>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        {hasExceeded ? 'Exceeded Limit' : remaining > 0 ? `${formatCurrency(remaining)} left` : 'No Limit'}
                      </p>
                    </div>
                  </div>

                  {/* Inline Limit Edit */}
                  <div className="text-right">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Limit (₹)</span>
                    <input
                      type="number"
                      defaultValue={cat.limit || ''}
                      onBlur={(e) => handleBudgetChange(cat.id, e.target.value)}
                      className="w-20 text-right font-bold text-sm block mt-0.5 bg-transparent border-b border-[var(--border)] focus:border-[var(--primary)] outline-none transition-colors"
                      placeholder="Set limit"
                    />
                  </div>
                </div>

                {/* Progress bar */}
                {cat.limit > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] font-bold text-[var(--text-muted)]">
                      <span className="flex items-center gap-1">
                        {hasExceeded ? (
                          <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                        Spent: {formatCurrency(cat.spent)}
                      </span>
                      <span>{percentage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-[var(--bg)]/50 rounded-full h-2 overflow-hidden shadow-inner border border-[var(--border)]/20">
                      <div 
                        className="h-2 rounded-full transition-all duration-700 shadow-sm"
                        style={{ 
                          width: `${percentage}%`, 
                          backgroundColor: hasExceeded ? '#EF4444' : percentage > 75 ? '#F59E0B' : categoryColor 
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] italic pt-2 border-t border-[var(--border)]/30">
                    <AlertTriangle className="w-3.5 h-3.5 opacity-60" />
                    <span>No spending limit configured</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
