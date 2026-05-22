import { useState, useEffect } from 'react'
import { categoriesApi, transactionsApi } from '../../api/client'
import { CATEGORY_COLORS, formatCurrency } from '../../utils/helpers'
import Modal from '../Modal'
import { Plus, Pencil, Trash2, Tags, ChevronLeft, ChevronRight, Settings, Eye, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

const ICONS = ['tag', 'utensils', 'car', 'shopping-bag', 'zap', 'film', 'heart', 'droplet',
  'cpu', 'book', 'gamepad', 'map-pin', 'shopping-cart', 'shirt', 'home', 'briefcase',
  'laptop', 'building', 'trending-up', 'gift', 'refresh-cw', 'plus-circle', 'star',
  'music', 'coffee', 'phone', 'globe', 'bus', 'train', 'plane']

const ICON_EMOJI_MAP = {
  tag: '🏷️', utensils: '🍽️', car: '🚗', 'shopping-bag': '🛍️', zap: '⚡', film: '🎬',
  heart: '❤️', droplet: '💧', cpu: '💻', book: '📚', gamepad: '🎮', 'map-pin': '📍',
  'shopping-cart': '🛒', shirt: '👕', home: '🏠', briefcase: '💼', laptop: '💻',
  building: '🏢', 'trending-up': '📈', gift: '🎁', 'refresh-cw': '🔄', 'plus-circle': '➕',
  star: '⭐', music: '🎵', coffee: '☕', phone: '📱', globe: '🌍', bus: '🚌',
  train: '🚂', plane: '✈️',
}

const EMPTY = { name: '', type: 'expense', icon: 'tag', color: '#6366f1' }

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [txnsLoading, setTxnsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('expense')
  const [manageMode, setManageMode] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  // Current Month selector
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const fetchCategories = async () => {
    try {
      const data = await categoriesApi.getAll()
      setCategories(data)
    } catch { 
      toast.error('Failed to load categories') 
    } finally { 
      setLoading(false) 
    }
  }

  const fetchTransactions = async () => {
    setTxnsLoading(true)
    try {
      const [year, month] = selectedMonth.split('-').map(Number)
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`
      
      const data = await transactionsApi.getAll({
        start_date: startDate,
        end_date: endDate,
        limit: 1000
      })
      setTransactions(data)
    } catch {
      toast.error('Failed to load category breakdown')
    } finally {
      setTxnsLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchTransactions()
  }, [selectedMonth])

  // Sync listener when transactions are added or updated elsewhere
  useEffect(() => {
    const handleSync = () => {
      fetchCategories()
      fetchTransactions()
    }
    window.addEventListener('transaction-saved', handleSync)
    return () => window.removeEventListener('transaction-saved', handleSync)
  }, [selectedMonth])

  const prevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const prev = new Date(y, m - 2, 1)
    setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`)
  }

  const nextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const next = new Date(y, m, 1)
    setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`)
  }

  const getMonthName = (monthStr) => {
    const [y, m] = monthStr.split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const openCreate = () => {
    setEditData(null)
    setForm({ ...EMPTY, type: activeTab })
    setFormOpen(true)
  }

  const openEdit = (cat) => {
    setEditData(cat)
    setForm({ name: cat.name, type: cat.type, icon: cat.icon, color: cat.color })
    setFormOpen(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this category? Existing transactions using it will be affected.')) return
    try {
      await categoriesApi.delete(id)
      toast.success('Category deleted')
      fetchCategories()
    } catch { 
      toast.error('Failed to delete') 
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editData) {
        await categoriesApi.update(editData.id, { name: form.name, icon: form.icon, color: form.color })
        toast.success('Category updated!')
      } else {
        await categoriesApi.create(form)
        toast.success('Category created!')
      }
      fetchCategories()
      fetchTransactions()
      setFormOpen(false)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // Filter definitions of active tab
  const filteredDefs = categories.filter(c => c.type === activeTab)

  // Accumulate spent/income per category in current selected month
  const categoryStats = {}
  let totalVolume = 0

  transactions.forEach(txn => {
    if (txn.type === activeTab) {
      const cId = txn.category_id
      categoryStats[cId] = (categoryStats[cId] || 0) + (txn.amount || 0)
      totalVolume += (txn.amount || 0)
    }
  })

  // Map definined categories to stats
  const breakdownList = filteredDefs.map(cat => {
    const amount = categoryStats[cat.id] || 0
    const percentage = totalVolume > 0 ? (amount / totalVolume) * 100 : 0
    return {
      ...cat,
      amount,
      percentage
    }
  }).sort((a, b) => b.amount - a.amount) // Sort by descending amount

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Month Switcher Header */}
      <div className="card p-4 sm:p-5 flex items-center justify-between shadow-sm border-[var(--border)]">
        <button 
          onClick={prevMonth} 
          className="p-2 hover:bg-[var(--bg)] rounded-xl transition-all active:scale-95 text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="font-bold text-base sm:text-lg tracking-wide select-none">
          {getMonthName(selectedMonth)}
        </h2>
        <button 
          onClick={nextMonth} 
          className="p-2 hover:bg-[var(--bg)] rounded-xl transition-all active:scale-95 text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Control Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="p-1 bg-[var(--card)] rounded-2xl border border-[var(--border)] flex shadow-sm w-full sm:w-auto">
          {['expense', 'income'].map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === t
                  ? t === 'income'
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/5'
              }`}
            >
              {t} Breakdown
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setManageMode(!manageMode)}
            className={`btn-secondary h-11 px-4 flex items-center gap-2 text-xs uppercase tracking-wider ${
              manageMode ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/30' : ''
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>{manageMode ? 'Exit Setup' : 'Manage'}</span>
          </button>
          <button onClick={openCreate} className="btn-primary h-11 px-5 flex items-center gap-2 text-xs uppercase tracking-wider">
            <Plus className="w-4 h-4" />
            <span>New Category</span>
          </button>
        </div>
      </div>

      {/* Categories Spent/Income Breakdown */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card p-6 animate-pulse h-28" />
          ))}
        </div>
      ) : breakdownList.length === 0 ? (
        <div className="card p-16 text-center shadow-sm border-[var(--border)]">
          <Tags className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)] opacity-30" />
          <p className="font-bold text-lg">No {activeTab} categories yet</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">Create categories or setup transactions to view metrics</p>
          <button onClick={openCreate} className="btn-primary mt-6 text-xs uppercase tracking-wider">
            Create First Category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {breakdownList.map(cat => {
            const emoji = ICON_EMOJI_MAP[cat.icon] || cat.icon || '🏷️'
            const categoryColor = cat.color || '#6366f1'

            return (
              <div 
                key={cat.id} 
                className="card p-5 space-y-4 hover:shadow-md transition-all relative overflow-hidden group border-[var(--border)] shadow-sm"
              >
                {/* Header info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl transition-all"
                      style={{ 
                        background: `${categoryColor}18`, 
                        border: `1.5px solid ${categoryColor}30` 
                      }}
                    >
                      {emoji}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[var(--text)]">{cat.name}</h3>
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                        {cat.percentage.toFixed(1)}% of total
                      </p>
                    </div>
                  </div>

                  {/* Actions or Value */}
                  <div className="flex items-center gap-2">
                    <AnimatePresence mode="wait">
                      {manageMode ? (
                        <motion.div 
                          key="actions"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-1.5 z-10"
                        >
                          <button
                            onClick={() => openEdit(cat)}
                            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--bg)] transition-all active:scale-90"
                            title="Edit Category"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cat.id)}
                            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-90"
                            title="Delete Category"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </motion.div>
                      ) : (
                        <motion.span 
                          key="amount"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className={`font-bold text-[15px] ${
                            activeTab === 'income' ? 'text-emerald-500' : 'text-[var(--text)]'
                          }`}
                        >
                          {formatCurrency(cat.amount)}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="w-full bg-[var(--bg)]/50 rounded-full h-2.5 overflow-hidden shadow-inner border border-[var(--border)]/20">
                    <div 
                      className="h-2.5 rounded-full transition-all duration-700 shadow-sm"
                      style={{ 
                        width: `${cat.percentage}%`, 
                        backgroundColor: categoryColor 
                      }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Form Modal */}
      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editData ? 'Edit Category' : 'New Category'}>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Live Preview */}
          <div 
            className="flex items-center gap-3 p-4 rounded-2xl border transition-all" 
            style={{ 
              background: `${form.color}08`, 
              borderColor: `${form.color}25` 
            }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
              style={{ 
                background: `${form.color}18`, 
                border: `2px solid ${form.color}35` 
              }}
            >
              {ICON_EMOJI_MAP[form.icon] || form.icon || '🏷️'}
            </div>
            <div>
              <p className="font-bold text-sm text-[var(--text)]">{form.name || 'Category Name'}</p>
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{form.type}</p>
            </div>
          </div>

          <div>
            <label className="label">Category Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="input text-sm font-semibold"
              placeholder="e.g. Food & Dining"
              required
            />
          </div>

          {!editData && (
            <div>
              <label className="label">Type</label>
              <div className="flex gap-2 p-1 bg-[var(--bg)]/50 rounded-2xl border border-[var(--border)]">
                {['expense', 'income'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set('type', t)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                      form.type === t
                        ? t === 'income'
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'bg-rose-500 text-white shadow-md'
                        : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="label">Icon / Emoji</label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={ICON_EMOJI_MAP[form.icon] ? '' : form.icon}
                onChange={e => set('icon', e.target.value)}
                className="input flex-1 text-sm font-medium"
                placeholder="Type or paste any emoji 🍕"
                maxLength={5}
              />
              <div 
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl font-bold border border-[var(--border)]"
                style={{ background: 'rgba(255, 255, 255, 0.05)' }}
              >
                {ICON_EMOJI_MAP[form.icon] || form.icon || '🏷️'}
              </div>
            </div>

            <div className="grid grid-cols-8 gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-black/10 rounded-2xl border border-[var(--border)]">
              {ICONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => set('icon', icon)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all hover:scale-115 ${
                    form.icon === icon ? 'ring-2 ring-[var(--primary)] bg-white/10' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  {ICON_EMOJI_MAP[icon] || '🏷️'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Color Palette</label>
            <div className="flex flex-wrap gap-2.5 p-1">
              {CATEGORY_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('color', c)}
                  className={`w-8 h-8 rounded-xl transition-all flex items-center justify-center relative shadow-sm ${
                    form.color === c 
                      ? 'scale-115 ring-2 ring-offset-2 ring-[var(--primary)] dark:ring-offset-[#1e293b]' 
                      : 'hover:scale-110'
                  }`}
                  style={{ background: c }}
                >
                  {form.color === c && <Check className="w-4.5 h-4.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <button type="button" onClick={() => setFormOpen(false)} className="btn-secondary flex-1 text-xs uppercase tracking-wider">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 text-xs uppercase tracking-wider">
              {saving ? 'Saving…' : editData ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  )
}
