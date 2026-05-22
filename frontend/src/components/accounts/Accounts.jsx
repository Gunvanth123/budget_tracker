import { useState, useEffect } from 'react'
import { accountsApi, usageApi } from '../../api/client'
import { formatCurrency, ACCOUNT_TYPES, ACCOUNT_TYPE_ICONS, CATEGORY_COLORS } from '../../utils/helpers'
import Modal from '../Modal'
import { Plus, Pencil, Trash2, Wallet, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

const EMPTY = { name: '', type: 'bank', balance: '', color: '#6366f1', currency: 'INR', is_default: false }

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

  useEffect(() => { 
    fetchAccounts() 
    usageApi.track('accounts')

    // Sync on transaction additions
    const handler = () => fetchAccounts();
    window.addEventListener('transaction-saved', handler);
    return () => window.removeEventListener('transaction-saved', handler);
  }, [])

  const openCreate = () => { setEditData(null); setForm(EMPTY); setFormOpen(true) }
  const openEdit = (acc) => {
    setEditData(acc)
    setForm({ name: acc.name, type: acc.type, balance: acc.balance, color: acc.color, currency: acc.currency, is_default: acc.is_default || false })
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
    <div className="space-y-6 pb-12">
      {/* Total balance banner */}
      <motion.div
        initial={{ scale: 0.99, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="card p-6 text-white border-0 overflow-hidden relative"
        style={{ 
          background: 'var(--balance-grad)',
          boxShadow: '0 15px 35px -10px rgba(59, 130, 246, 0.35)'
        }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <p className="text-xs font-bold uppercase tracking-wider opacity-85">Total Balance Across All Accounts</p>
        <p className="font-extrabold text-3xl mt-2 tracking-tight">{formatCurrency(totalBalance)}</p>
        <p className="text-[10px] uppercase font-bold tracking-wider opacity-60 mt-3">{accounts.length} active account{accounts.length !== 1 ? 's' : ''}</p>
      </motion.div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-sm uppercase tracking-wider" style={{ color: 'var(--text)' }}>Your Accounts</h2>
          <p className="text-[10px] opacity-40 font-semibold mt-0.5">Manage your banks, cards and cash wallets</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold">
          <Plus className="w-4 h-4" />
          Add Account
        </button>
      </div>

      {/* Account cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="card p-5 animate-pulse h-36 bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="card p-12 text-center" style={{ color: 'var(--text-muted)' }}>
          <Wallet className="w-10 h-10 mx-auto mb-3 opacity-30 text-indigo-500" />
          <p className="font-bold text-sm">No accounts found</p>
          <p className="text-xs mt-1 opacity-70">Add your first wallet or bank account to begin tracking</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => (
            <div key={acc.id} className="card p-5 group relative overflow-hidden flex flex-col justify-between min-h-[160px]">
              
              {/* Star Default Badge */}
              {acc.is_default && (
                <div 
                  className="absolute top-0 right-0 bg-gradient-to-br from-yellow-400 to-amber-500 text-white text-[9px] font-bold px-2.5 py-1 rounded-bl-xl rounded-tr-[23px] shadow-md flex items-center gap-1 uppercase tracking-widest z-10"
                >
                  <Star className="w-2.5 h-2.5 fill-white" /> Default
                </div>
              )}

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm font-semibold shrink-0"
                    style={{ background: `${acc.color}15`, border: `1px solid ${acc.color}25` }}
                  >
                    {ACCOUNT_TYPE_ICONS[acc.type] || '💼'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs truncate" style={{ color: 'var(--text)' }}>{acc.name}</p>
                    <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color: 'var(--text-muted)' }}>{acc.type.replace('_', ' ')}</p>
                  </div>
                </div>

                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 bottom-4 lg:static">
                  <button
                    onClick={() => openEdit(acc)}
                    className="p-1.5 rounded-lg border border-slate-500/10 hover:border-slate-500/30 hover:bg-white/5 transition-all text-slate-400 hover:text-indigo-400"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(acc.id)}
                    className="p-1.5 rounded-lg border border-red-500/10 hover:border-red-500/30 hover:bg-red-500/5 transition-all text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <span className="text-[9px] font-bold uppercase tracking-wider opacity-40 block">Available Balance</span>
                <p
                  className="font-extrabold text-xl mt-0.5 tracking-tight"
                  style={{ color: acc.balance < 0 ? '#EF4444' : 'var(--text)' }}
                >
                  {formatCurrency(acc.balance)}
                </p>
              </div>

              {/* Progress bar */}
              <div className="mt-4 pt-3 border-t border-slate-500/5">
                <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, (acc.balance / (totalBalance || 1)) * 100))}%`,
                      background: acc.color || 'var(--primary)'
                    }}
                  />
                </div>
                <div className="flex justify-between items-center mt-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  <span>Usage Ratio</span>
                  <span>{totalBalance > 0 ? ((acc.balance / totalBalance) * 100).toFixed(1) : 0}%</span>
                </div>
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
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
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
            <label className="label">Card Accent Color</label>
            <div className="flex flex-wrap gap-2.5">
              {CATEGORY_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('color', c)}
                  className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-2 ring-indigo-500' : 'hover:scale-110'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input 
              type="checkbox" 
              id="is_default" 
              checked={form.is_default} 
              onChange={e => set('is_default', e.target.checked)}
              className="w-4 h-4 text-indigo-500 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="is_default" className="text-xs font-bold uppercase tracking-wider cursor-pointer" style={{ color: 'var(--text-muted)' }}>
              Set as Default Account
            </label>
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
