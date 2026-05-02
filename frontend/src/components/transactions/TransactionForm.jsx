import { useState, useEffect } from 'react'
import Modal from '../Modal'
import { transactionsApi, categoriesApi, accountsApi, usageApi } from '../../api/client'
import { ACCOUNT_TYPE_ICONS, todayISO, formatDateInput } from '../../utils/helpers'
import toast from 'react-hot-toast'

const EMPTY = {
  type: 'expense',
  amount: '',
  category_id: '',
  account_id: '',
  date: todayISO(),
  notes: '',
  currency: 'INR',
}

const ICON_EMOJI_MAP = {
  tag: '🏷️', utensils: '🍽️', car: '🚗', 'shopping-bag': '🛍️', zap: '⚡', film: '🎬',
  heart: '❤️', droplet: '💧', cpu: '💻', book: '📚', gamepad: '🎮', 'map-pin': '📍',
  'shopping-cart': '🛒', shirt: '👕', home: '🏠', briefcase: '💼', laptop: '💻',
  building: '🏢', 'trending-up': '📈', gift: '🎁', 'refresh-cw': '🔄', 'plus-circle': '➕',
  star: '⭐', music: '🎵', coffee: '☕', phone: '📱', globe: '🌍', bus: '🚌',
  train: '🚂', plane: '✈️',
}

export default function TransactionForm({ isOpen, onClose, onSaved, editData }) {
  const [form, setForm] = useState(EMPTY)
  const [categories, setCategories] = useState([])
  const [accounts, setAccounts] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      categoriesApi.getAll().then(setCategories)
      accountsApi.getAll().then(setAccounts)
      if (editData) {
        setForm({
          type: editData.type,
          amount: editData.amount,
          category_id: editData.category_id,
          account_id: editData.account_id,
          date: formatDateInput(editData.date) || todayISO(),
          notes: editData.notes || '',
          currency: editData.currency || 'INR',
        })
      } else {
        setForm(EMPTY)
      }
    }
  }, [isOpen, editData])

  const filteredCategories = categories.filter(c => c.type === form.type)

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.category_id || !form.account_id) {
      toast.error('Please select a category and account')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        category_id: parseInt(form.category_id),
        account_id: parseInt(form.account_id),
        date: new Date(form.date).toISOString(),
      }
      if (editData) {
        await transactionsApi.update(editData.id, payload)
        toast.success('Transaction updated!')
      } else {
        await transactionsApi.create(payload)
        usageApi.track('transaction')
        toast.success('Transaction added!')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save transaction')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editData ? 'Edit Transaction' : 'Add Transaction'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type toggle */}
        <div className="flex rounded-xl overflow-hidden border border-[var(--border)]">
          {['expense', 'income'].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => { set('type', t); set('category_id', '') }}
              className={`flex-1 py-2.5 text-sm font-semibold capitalize transition-all ${
                form.type === t
                  ? t === 'income'
                    ? 'bg-emerald-500 text-white shadow-lg'
                    : 'bg-red-500 text-white shadow-lg'
                  : 'bg-transparent text-slate-500 hover:bg-white/5'
              }`}
            >
              {t === 'income' ? '↑ Income' : '↓ Expense'}
            </button>
          ))}
        </div>

        {/* Amount */}
        <div>
          <label className="label">Amount (₹)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">₹</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={form.amount}
              onChange={e => set('amount', e.target.value)}
              className="input pl-7 font-mono text-lg"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="label">Category</label>
          <select
            value={form.category_id}
            onChange={e => set('category_id', e.target.value)}
            className="select"
            required
          >
            <option value="">Select category…</option>
            {filteredCategories.map(c => {
              const emoji = ICON_EMOJI_MAP[c.icon] || c.icon || '🏷️'
              return (
                <option key={c.id} value={c.id}>
                  {emoji} {c.name}
                </option>
              )
            })}
          </select>
        </div>

        {/* Account */}
        <div>
          <label className="label">Account</label>
          <select
            value={form.account_id}
            onChange={e => set('account_id', e.target.value)}
            className="select"
            required
          >
            <option value="">Select account…</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>
                {ACCOUNT_TYPE_ICONS[a.type] || '💼'} {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <label className="label">Date & Time</label>
          <input
            type="datetime-local"
            value={form.date}
            onChange={e => set('date', e.target.value)}
            className="input"
            required
          />
        </div>

        {/* Notes */}
        <div>
          <label className="label">Notes (optional)</label>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            className="input resize-none"
            rows={2}
            placeholder="What was this for?"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving…' : editData ? 'Update' : 'Add Transaction'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
