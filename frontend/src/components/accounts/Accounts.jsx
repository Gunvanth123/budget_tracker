import { useState, useEffect } from 'react'
import { accountsApi } from '../../api/client'
import { formatCurrency, ACCOUNT_TYPES, ACCOUNT_TYPE_ICONS, CATEGORY_COLORS } from '../../utils/helpers'
import Modal from '../Modal'
import { Plus, Pencil, Trash2, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'

const EMPTY = { name: '', type: 'bank', balance: '', color: '#6366f1', currency: 'INR' }

export default function Accounts() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const fetchAccounts = async () => {
    try {
      const data = await accountsApi.getAll()
      setAccounts(data)
    } catch {
      toast.error('Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAccounts() }, [])

  const openCreate = () => { setEditData(null); setForm(EMPTY); setFormOpen(true) }
  const openEdit = (acc) => {
    setEditData(acc)
    setForm({ name: acc.name, type: acc.type, balance: acc.balance, color: acc.color, currency: acc.currency })
    setFormOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, balance: parseFloat(form.balance) || 0 }
      if (editData) {
        await accountsApi.update(editData.id, payload)
        toast.success('Account updated!')
      } else {
        await accountsApi.create(payload)
        toast.success('Account created!')
      }
      fetchAccounts()
      setFormOpen(false)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this account? This may affect existing transactions.')) return
    try {
      await accountsApi.delete(id)
      toast.success('Account deleted')
      fetchAccounts()
    } catch {
      toast.error('Failed to delete account')
    }
  }

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="space-y-5">
      {/* Total balance banner */}
      <div
        className="card p-5 text-white border-0"
        style={{ background: 'linear-gradient(135deg, #00A19B 0%, #007A75 100%)' }}
      >
        <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.75)' }}>Total Balance Across All Accounts</p>
        <p className="font-bold text-3xl mt-1">{formatCurrency(totalBalance)}</p>
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>{accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold" style={{ color: 'var(--text)' }}>Your Accounts</h2>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Account
        </button>
      </div>

      {/* Account cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="card p-5 animate-pulse h-36" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="card p-12 text-center" style={{ color: 'var(--text-muted)' }}>
          <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No accounts yet</p>
          <p className="text-sm mt-1">Create your first account to start tracking</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => (
            <div key={acc.id} className="card p-5 group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm"
                    style={{ background: `${acc.color}20`, border: `1.5px solid ${acc.color}40` }}
                  >
                    {ACCOUNT_TYPE_ICONS[acc.type] || '💼'}
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{acc.name}</p>
                    <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{acc.type.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(acc)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.color = 'var(--primary)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(acc.id)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#EF4444' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Balance</p>
                <p
                  className="font-bold text-2xl"
                  style={{ color: acc.balance < 0 ? '#EF4444' : 'var(--text)' }}
                >
                  {formatCurrency(acc.balance)}
                </p>
              </div>

              <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, (acc.balance / (totalBalance || 1)) * 100))}%`,
                      background: acc.color
                    }}
                  />
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {totalBalance > 0 ? ((acc.balance / totalBalance) * 100).toFixed(1) : 0}% of total
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editData ? 'Edit Account' : 'New Account'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Account Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="input"
              placeholder="e.g. SBI Savings, Paytm Wallet"
              required
            />
          </div>
          <div>
            <label className="label">Account Type</label>
            <select value={form.type} onChange={e => set('type', e.target.value)} className="select">
              {ACCOUNT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Opening Balance (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono" style={{ color: 'var(--text-muted)' }}>₹</span>
              <input
                type="number"
                step="0.01"
                value={form.balance}
                onChange={e => set('balance', e.target.value)}
                className="input pl-7 font-mono"
                placeholder="0.00"
              />
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
                  className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-2 ring-[var(--primary)]' : 'hover:scale-110'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setFormOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : editData ? 'Update' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
