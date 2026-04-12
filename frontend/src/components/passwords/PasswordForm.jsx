import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { passwordsApi } from '../../api/client'
import toast from 'react-hot-toast'
import CryptoJS from 'crypto-js'

export default function PasswordForm({ isOpen, onClose, onSaved, masterPassword, editData }) {
  const [formData, setFormData] = useState({
    website: '',
    username: '',
    password: '',
    notes: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editData && isOpen) {
      try {
        const bytes = CryptoJS.AES.decrypt(editData.encrypted_password, masterPassword)
        const decrypted = bytes.toString(CryptoJS.enc.Utf8)
        setFormData({
          website: editData.website,
          username: editData.username,
          password: decrypted || '',
          notes: editData.notes || ''
        })
      } catch (err) {
        setFormData({ website: editData.website, username: editData.username, password: '', notes: editData.notes || '' })
        toast.error("Failed to decrypt password for editing.")
      }
    } else if (isOpen) {
      setFormData({ website: '', username: '', password: '', notes: '' })
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
      const encrypted_password = CryptoJS.AES.encrypt(formData.password, masterPassword).toString()
      
      const payload = { 
        website: formData.website,
        username: formData.username,
        notes: formData.notes,
        encrypted_password 
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-bold">{editData ? 'Edit Password' : 'Add Password'}</h2>
          <button onClick={onClose} className="p-2 opacity-70 hover:opacity-100 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Website / App Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Netflix, bank.com"
              value={formData.website}
              onChange={e => setFormData({ ...formData, website: e.target.value })}
              className="input"
            />
          </div>

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
              type="text" /* Text is fine in modal to see what you type */
              required
              placeholder="••••••••"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              className="input font-mono"
            />
          </div>

          <div>
            <label className="label">Notes (Optional)</label>
            <textarea
              placeholder="Any hints or security questions"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="input min-h-[80px] resize-y"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
