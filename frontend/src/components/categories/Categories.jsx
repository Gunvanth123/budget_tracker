import { useState, useEffect } from 'react'
import { categoriesApi } from '../../api/client'
import { CATEGORY_COLORS } from '../../utils/helpers'
import Modal from '../Modal'
import { Plus, Pencil, Trash2, Tags } from 'lucide-react'
import toast from 'react-hot-toast'

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

function CategoryCard({ cat, onEdit, onDelete }) {
  return (
    <div className="card p-4 group flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: `${cat.color}20`, border: `1.5px solid ${cat.color}40` }}
      >
        {ICON_EMOJI_MAP[cat.icon] || '🏷️'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-slate-700 truncate">{cat.name}</p>
        <span className={`text-xs ${cat.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
          {cat.type}
        </span>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(cat)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-brand-600 transition-colors">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onDelete(cat.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('expense')
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const fetchCategories = async () => {
    try {
      const data = await categoriesApi.getAll()
      setCategories(data)
    } catch { toast.error('Failed to load categories') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchCategories() }, [])

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
    } catch { toast.error('Failed to delete') }
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
      setFormOpen(false)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const filtered = categories.filter(c => c.type === activeTab)
  const expenseCount = categories.filter(c => c.type === 'expense').length
  const incomeCount = categories.filter(c => c.type === 'income').length

  return (
    <div className="space-y-5">
      {/* Tabs + Add */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1">
          {['expense', 'income'].map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                activeTab === t
                  ? t === 'income'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-red-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t} ({t === 'expense' ? expenseCount : incomeCount})
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Category
        </button>
      </div>

      {/* Category grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="card p-4 animate-pulse h-16" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <Tags className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No {activeTab} categories yet</p>
          <p className="text-sm mt-1">Click "New Category" to add one</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(cat => (
            <CategoryCard key={cat.id} cat={cat} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Form Modal */}
      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editData ? 'Edit Category' : 'New Category'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Preview */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ background: `${form.color}20`, border: `2px solid ${form.color}40` }}
            >
              {ICON_EMOJI_MAP[form.icon] || '🏷️'}
            </div>
            <div>
              <p className="font-semibold text-slate-700">{form.name || 'Category Name'}</p>
              <p className="text-xs text-slate-400 capitalize">{form.type}</p>
            </div>
          </div>

          <div>
            <label className="label">Category Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="input"
              placeholder="e.g. Food & Dining"
              required
            />
          </div>

          {!editData && (
            <div>
              <label className="label">Type</label>
              <div className="flex gap-2">
                {['expense', 'income'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set('type', t)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${
                      form.type === t
                        ? t === 'income' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="label">Icon</label>
            <div className="grid grid-cols-8 gap-1.5 max-h-32 overflow-y-auto p-1">
              {ICONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => set('icon', icon)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all hover:scale-110 ${
                    form.icon === icon ? 'ring-2 ring-brand-400 ring-offset-1 bg-brand-50' : 'hover:bg-slate-100'
                  }`}
                >
                  {ICON_EMOJI_MAP[icon] || '🏷️'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Color</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('color', c)}
                  className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-1 ring-slate-400' : 'hover:scale-110'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setFormOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : editData ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
