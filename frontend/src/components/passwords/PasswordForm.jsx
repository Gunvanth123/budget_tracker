import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Save, FolderPlus, ShieldCheck, Key, User, Globe, FileText, ChevronDown } from 'lucide-react'
import { passwordsApi } from '../../api/client'
import toast from 'react-hot-toast'
import CryptoJS from 'crypto-js'
import { motion, AnimatePresence } from 'framer-motion'

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
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay backdrop-blur-xl bg-slate-950/60 flex items-center justify-center p-4 z-[99999]">
          {/* Overlay Click-out */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            onClick={onClose}
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="modal-content w-full max-w-lg max-h-[90vh] overflow-y-auto relative z-10 flex flex-col bg-white/70 dark:bg-[#0f1628]/70 border border-white/20 dark:border-white/10 shadow-2xl rounded-3xl"
          >
            {/* Ambient glows inside modal */}
            <div className="absolute top-0 left-10 w-32 h-32 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-10 w-32 h-32 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between p-5 border-b border-black/5 dark:border-white/5 sticky top-0 bg-transparent backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Key className="w-4.5 h-4.5" />
                </div>
                <h2 className="text-lg font-extrabold text-[var(--text)] tracking-tight">
                  {editData ? 'Edit Password' : 'New Security Key'}
                </h2>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 text-[var(--text-muted)] opacity-70 hover:opacity-100 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 relative">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Website / App Name</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] opacity-50" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Amazon"
                      value={formData.website}
                      onChange={e => setFormData({ ...formData, website: e.target.value })}
                      className="input pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Folder Category</label>
                  <div className="relative">
                    <select
                      value={formData.category_id}
                      onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                      className="select"
                    >
                      <option value="">Uncategorized</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                      <option value="new">+ Create New...</option>
                    </select>
                  </div>
                </div>
              </div>

              {formData.category_id === 'new' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-1 overflow-hidden"
                >
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">New Folder Name</label>
                  <div className="relative">
                    <FolderPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] opacity-50" />
                    <input
                      type="text"
                      placeholder="e.g. Financial, Personal"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      className="input pl-10"
                      autoFocus
                    />
                  </div>
                </motion.div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Username or Email</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] opacity-50" />
                  <input
                    type="text"
                    required
                    placeholder="name@email.com"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    className="input pl-10"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Password / Secret Key</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] opacity-50" />
                  <input
                    type="text"
                    required
                    placeholder="Strong password"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="input pl-10 font-mono tracking-wide"
                  />
                </div>
              </div>

              <div className="bg-indigo-500/5 dark:bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/10 space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Secure 2FA Recovery Codes
                </label>
                <textarea
                  placeholder="Paste your 2FA backup codes or recovery phrases here..."
                  value={formData.backup_codes}
                  onChange={e => setFormData({ ...formData, backup_codes: e.target.value })}
                  className="w-full min-h-[90px] text-xs font-mono resize-none bg-black/5 dark:bg-black/30 border border-black/5 dark:border-white/5 focus:border-indigo-500/30 focus:outline-none p-3 rounded-xl text-[var(--text)] transition-colors"
                />
                <p className="text-[9px] text-[var(--text-muted)] font-medium">These keys are encrypted on your client device using AES-256 before upload.</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Notes (Optional)</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-[var(--text-muted)] opacity-50" />
                  <textarea
                    placeholder="Enter additional hints, recovery questions, or details..."
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="input pl-10 min-h-[70px] resize-y"
                  />
                </div>
              </div>

              <div className="pt-3 flex flex-col sm:flex-row gap-3">
                <button 
                  type="button" 
                  onClick={onClose} 
                  className="btn-secondary order-2 sm:order-1 py-3 flex-1 flex items-center justify-center text-xs uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving} 
                  className="btn-primary order-1 sm:order-2 py-3 flex-1 flex items-center justify-center gap-2 text-xs uppercase tracking-wider bg-gradient-to-r from-indigo-500 to-indigo-600 border-none shadow-lg shadow-indigo-500/20"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Encrypting...' : 'Save Vault Entry'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

