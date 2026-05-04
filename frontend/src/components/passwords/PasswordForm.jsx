import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Save, FolderPlus, ShieldCheck } from 'lucide-react'
import { passwordsApi } from '../../api/client'
import toast from 'react-hot-toast'
import CryptoJS from 'crypto-js'

export default function PasswordForm({ isOpen, onClose, onSaved, masterPassword, editData }) {
  const [formData, setFormData] = useState({
    website: '',
    username: '',
    password: '',
    backup_codes: '',
    notes: '',
    category_id: ''
  })
  const [categories, setCategories] = useState([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      passwordsApi.getCategories().then(setCategories).catch(() => {})
    }

    if (editData && isOpen) {
      try {
        const bytes = CryptoJS.AES.decrypt(editData.encrypted_password, masterPassword)
        const decrypted = bytes.toString(CryptoJS.enc.Utf8)
        
        let decBackup = ''
        if (editData.backup_codes) {
          const bBytes = CryptoJS.AES.decrypt(editData.backup_codes, masterPassword)
          decBackup = bBytes.toString(CryptoJS.enc.Utf8)
        }

        setFormData({
          website: editData.website,
          username: editData.username,
          password: decrypted || '',
          backup_codes: decBackup || '',
          notes: editData.notes || '',
          category_id: editData.category_id || ''
        })
      } catch (err) {
        setFormData({ 
          website: editData.website, 
          username: editData.username, 
          password: '', 
          backup_codes: '',
          notes: editData.notes || '',
          category_id: editData.category_id || ''
        })
        toast.error("Failed to decrypt data for editing.")
      }
    } else if (isOpen) {
      setFormData({ website: '', username: '', password: '', backup_codes: '', notes: '', category_id: '' })
      setNewCategoryName('')
    }
  }, [editData, isOpen, masterPassword])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.website || !formData.username || !formData.password) {
      return toast.error("Please fill all required fields")
    }

    setSaving(true)
    try {
      // 1. Handle New Category if needed
      let catId = formData.category_id
      if (catId === 'new' && newCategoryName.trim()) {
        const newCat = await passwordsApi.createCategory({ name: newCategoryName })
        catId = newCat.id
      }

      const encrypted_password = CryptoJS.AES.encrypt(formData.password, masterPassword).toString()
      const encrypted_backup = formData.backup_codes 
        ? CryptoJS.AES.encrypt(formData.backup_codes, masterPassword).toString()
        : null
      
      const payload = { 
        website: formData.website,
        username: formData.username,
        notes: formData.notes,
        encrypted_password,
        backup_codes: encrypted_backup,
        category_id: catId === 'new' ? null : (catId ? parseInt(catId) : null)
      }

      if (editData) {
        await passwordsApi.update(editData.id, payload)
        toast.success("Password updated")
      } else {
        await passwordsApi.create(payload)
        toast.success("Password saved")
      }
      onSaved()
      onClose()
    } catch (e) {
      console.error(e)
      toast.error("Failed to save password entry")
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 sm:p-5 border-b sticky top-0 bg-[var(--card)] z-10" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-base sm:text-lg font-bold">{editData ? 'Edit Security Entry' : 'Add Security Entry'}</h2>
          <button onClick={onClose} className="p-2 opacity-70 hover:opacity-100 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Website / App *</label>
              <input
                type="text"
                required
                placeholder="e.g. Netflix"
                value={formData.website}
                onChange={e => setFormData({ ...formData, website: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Category</label>
              <select
                value={formData.category_id}
                onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                className="select"
              >
                <option value="">Uncategorized</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                <option value="new">+ Add New Category</option>
              </select>
            </div>
          </div>

          {formData.category_id === 'new' && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <label className="label">New Category Name</label>
              <div className="relative">
                <FolderPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                <input
                  type="text"
                  placeholder="e.g. Banking, Social Media"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  className="input pl-9"
                  autoFocus
                />
              </div>
            </div>
          )}

          <div>
            <label className="label">Username / Email *</label>
            <input
              type="text"
              required
              placeholder="user@example.com"
              value={formData.username}
              onChange={e => setFormData({ ...formData, username: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="label">Password *</label>
            <input
              type="text"
              required
              placeholder="••••••••"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              className="input font-mono"
            />
          </div>

          <div className="bg-indigo-500/5 p-3 rounded-xl border border-indigo-500/10 space-y-2">
            <label className="label flex items-center gap-2 text-indigo-500">
              <ShieldCheck className="w-4 h-4" /> Secure Backup Codes
            </label>
            <textarea
              placeholder="Paste your 2FA recovery keys or backup codes here..."
              value={formData.backup_codes}
              onChange={e => setFormData({ ...formData, backup_codes: e.target.value })}
              className="input min-h-[100px] text-xs font-mono resize-none bg-transparent border-none focus:ring-0 p-0"
            />
            <p className="text-[10px] opacity-50 italic">These codes will be end-to-end encrypted.</p>
          </div>

          <div>
            <label className="label">Notes (Optional)</label>
            <textarea
              placeholder="Any hints or security questions"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="input min-h-[60px] resize-y"
            />
          </div>

          <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row gap-3">
            <button type="button" onClick={onClose} className="btn-secondary order-2 sm:order-1 py-3 sm:py-2.5 flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary order-1 sm:order-2 py-3 sm:py-2.5 flex-1 flex items-center justify-center gap-2 shadow-lg shadow-[var(--primary)]/10">
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Security Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
