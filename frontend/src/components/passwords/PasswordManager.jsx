import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, Eye, EyeOff, Lock, Unlock, Copy, Download, Trash2, Pencil,
  FolderOpen, ChevronDown, ChevronRight, Search, ShieldCheck, Key
} from 'lucide-react'
import { passwordsApi, usageApi } from '../../api/client'
import toast from 'react-hot-toast'
import CryptoJS from 'crypto-js'
import PasswordForm from './PasswordForm'
import XlsxPopulate from 'xlsx-populate/browser/xlsx-populate.js'
import { saveAs } from 'file-saver'

export default function PasswordManager() {
  const [status, setStatus] = useState('loading') // loading, setup, locked, unlocked
  const [masterPassword, setMasterPassword] = useState('')
  const [passwords, setPasswords] = useState([])
  const [categories, setCategories] = useState([])
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false)
  
  // UI States
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState(null)
  const [revealed, setRevealed] = useState(new Set())
  const [revealedBackups, setRevealedBackups] = useState(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [collapsedCategories, setCollapsedCategories] = useState({})

  const checkStatus = useCallback(async () => {
    try {
      const res = await passwordsApi.status()
      if (!res.is_setup) {
        setStatus('setup')
      } else if (status !== 'unlocked') {
        setStatus('locked')
      }
    } catch (e) {
      toast.error("Failed to connect to password manager")
    }
  }, [status])

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  const fetchAll = async () => {
    try {
      const [pData, cData] = await Promise.all([
        passwordsApi.getAll(),
        passwordsApi.getCategories()
      ])
      setPasswords(pData)
      setCategories(cData)
    } catch {
      toast.error("Failed to fetch vault data")
    }
  }

  const handleSetup = async (e) => {
    e.preventDefault()
    if (!masterPassword || masterPassword.length < 4) {
      return toast.error("Password must be at least 4 characters")
    }
    try {
      await passwordsApi.setup(masterPassword)
      toast.success("Master password configured")
      setStatus('unlocked')
      fetchAll()
      usageApi.track('passwords')
    } catch {
      toast.error("Failed to setup master password")
    }
  }

  const handleUnlock = async (e) => {
    e.preventDefault()
    try {
      await passwordsApi.verify(masterPassword)
      setStatus('unlocked')
      fetchAll()
      usageApi.track('passwords')
      toast.success("Unlocked successfully")
    } catch {
      toast.error("Invalid master password")
      setMasterPassword('')
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard")
  }

  const toggleReveal = (id) => {
    setRevealed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleRevealBackup = (id) => {
    setRevealedBackups(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const getDecrypted = (encrypted) => {
    if (!encrypted) return ''
    try {
      const bytes = CryptoJS.AES.decrypt(encrypted, masterPassword)
      return bytes.toString(CryptoJS.enc.Utf8) || 'Error'
    } catch {
      return 'Error'
    }
  }

  const handleDeleteCategory = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this category? Associated passwords will become uncategorized.')) return
    try {
      await passwordsApi.deleteCategory(id)
      toast.success('Category deleted')
      if (selectedCategory === id) setSelectedCategory('all')
      fetchAll()
    } catch {
      toast.error('Failed to delete category')
    }
  }

  const handleEditCategory = async (e, cat) => {
    e.stopPropagation()
    const newName = prompt('Enter new category name:', cat.name)
    if (!newName || newName === cat.name) return
    try {
      await passwordsApi.updateCategory(cat.id, { name: newName })
      toast.success('Category updated')
      fetchAll()
    } catch {
      toast.error('Failed to update category')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this password entry?')) return
    try {
      await passwordsApi.delete(id)
      toast.success('Deleted')
      fetchAll()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleExport = async () => {
    if (passwords.length === 0) {
      toast.error('No passwords to export')
      return
    }

    try {
      const workbook = await XlsxPopulate.fromBlankAsync()
      const sheet = workbook.sheet(0)
      sheet.name("Passwords")

      sheet.row(1).style("bold", true).style("fill", "00A19B").style("fontColor", "ffffff")
      sheet.cell("A1").value("Website / App")
      sheet.cell("B1").value("Username / Email")
      sheet.cell("C1").value("Password")
      sheet.cell("D1").value("Backup Codes")
      sheet.cell("E1").value("Category")
      sheet.cell("F1").value("Notes")

      sheet.column("A").width(25)
      sheet.column("B").width(30)
      sheet.column("C").width(25)
      sheet.column("D").width(30)
      sheet.column("E").width(20)
      sheet.column("F").width(40)

      passwords.forEach((entry, idx) => {
        const row = idx + 2
        const decPwd = getDecrypted(entry.encrypted_password)
        const decBackup = getDecrypted(entry.backup_codes)
        sheet.cell(`A${row}`).value(entry.website)
        sheet.cell(`B${row}`).value(entry.username)
        sheet.cell(`C${row}`).value(decPwd)
        sheet.cell(`D${row}`).value(decBackup)
        sheet.cell(`E${row}`).value(entry.category?.name || 'Uncategorized')
        sheet.cell(`F${row}`).value(entry.notes || '')
      })

      const blob = await workbook.outputAsync({ password: masterPassword })
      saveAs(blob, `passwords_export.xlsx`)
      toast.success('Vault securely exported and locked!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to generate Encrypted Excel file')
    }
  }

  const groupedPasswords = useMemo(() => {
    let filtered = passwords.filter(p => 
      p.website.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.username.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => {
        if (selectedCategory === 'uncategorized') return !p.category_id
        return p.category_id === parseInt(selectedCategory)
      })
    }

    const groups = {}
    filtered.forEach(p => {
      const catId = p.category_id || 'uncategorized'
      const catName = p.category?.name || 'Uncategorized'
      if (!groups[catId]) {
        groups[catId] = { id: catId, name: catName, items: [] }
      }
      groups[catId].items.push(p)
    })
    return Object.values(groups)
  }, [passwords, searchQuery, selectedCategory])

  const toggleCategory = (catId) => {
    setCollapsedCategories(prev => ({ ...prev, [catId]: !prev[catId] }))
  }

  if (status === 'loading') {
    return <div className="p-12 text-center opacity-70 flex flex-col items-center justify-center gap-3">
      <Lock className="w-8 h-8 animate-pulse text-[var(--primary)]"/>
      <p className="font-medium">Securing connection to encrypted vault...</p>
    </div>
  }

  if (status === 'setup') {
    return (
      <div className="max-w-md mx-auto mt-10 card p-8 space-y-6 shadow-2xl border-t-4 border-[var(--primary)]">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full flex items-center justify-center shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold">Initialize Your Vault</h2>
          <p className="text-sm opacity-70">Create a master password to encrypt your credentials locally. <b>Warning:</b> This cannot be reset.</p>
        </div>
        <form onSubmit={handleSetup} className="space-y-4 pt-4">
          <input
            type="password"
            autoFocus
            required
            placeholder="Create Master Password"
            value={masterPassword}
            onChange={e => setMasterPassword(e.target.value)}
            className="input w-full p-4 text-center tracking-[0.3em] font-bold text-lg"
          />
          <button type="submit" className="btn-primary w-full py-4 text-lg shadow-lg shadow-[var(--primary)]/20">Initialize Vault</button>
        </form>
      </div>
    )
  }

  if (status === 'locked') {
    return (
      <div className="max-w-md mx-auto mt-10 card p-8 space-y-6 shadow-2xl border-t-4 border-slate-700">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-white mb-2">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold">Vault Locked</h2>
          <p className="text-sm opacity-70">Your security data is encrypted. Enter your master password to unlock.</p>
        </div>
        <form onSubmit={handleUnlock} className="space-y-4 pt-4">
          <input
            type="password"
            autoFocus
            required
            placeholder="Master Password"
            value={masterPassword}
            onChange={e => setMasterPassword(e.target.value)}
            className="input w-full p-4 text-center tracking-[0.3em] font-bold text-lg"
          />
          <button type="submit" className="btn-primary w-full py-4 flex items-center justify-center gap-3 text-lg">
            <Unlock className="w-5 h-5" /> Unlock Vault
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="w-full max-w-full space-y-6 overflow-hidden">
      {/* Header & Controls */}
      {/* Header & Controls - Mobile Optimized */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-sm space-y-4 min-w-0 overflow-hidden">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-teal-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/30 shrink-0">
            <Key className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-lg font-bold truncate">Security Vault</h2>
            <p className="text-[10px] sm:text-xs opacity-50 font-medium tracking-tight truncate">Military-Grade Encryption</p>
          </div>
          <button onClick={() => { setStatus('locked'); setMasterPassword(''); setPasswords([]); }} className="p-2 opacity-30 hover:opacity-100 hover:text-red-500 shrink-0">
            <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-30" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full bg-[var(--bg)] border-none rounded-xl pl-8 sm:pl-9 pr-4 py-2 sm:py-2.5 text-[11px] sm:text-xs focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={handleExport} className="p-2 sm:p-2.5 rounded-xl bg-[var(--bg)] hover:bg-[var(--border)] transition-colors">
              <Download className="w-4 h-4 sm:w-5 sm:h-5 opacity-60" />
            </button>
            <button 
              onClick={() => { setEditData(null); setFormOpen(true) }} 
              className="p-2 sm:px-6 sm:py-2.5 rounded-xl bg-teal-500 text-white shadow-lg shadow-teal-500/20 flex items-center gap-2 active:scale-95 transition-all"
            >
              <Plus className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline text-xs font-bold">Add Entry</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Action Button (Mobile) - Portal ensures it's always on top */}
      {createPortal(
        <button 
            onClick={() => { setEditData(null); setFormOpen(true) }}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-teal-500 text-white shadow-2xl shadow-teal-500/40 flex items-center justify-center z-[9999] sm:hidden active:scale-95 transition-transform"
        >
            <Plus className="w-6 h-6" />
        </button>,
        document.body
      )}


      {/* Category Filter - Universal Custom Dropdown (All Screens) */}
      <div className="mb-6 w-full">
        <div className="relative w-full z-30">
          <button
            onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)}
            className="flex items-center justify-between w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs font-bold transition-all focus:ring-2 focus:ring-teal-500/20 shadow-sm hover:border-teal-500/30"
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-teal-500" />
              <span>{selectedCategory === 'all' ? 'All Credentials' : selectedCategory === 'uncategorized' ? 'Uncategorized' : categories.find(c => c.id === selectedCategory)?.name || 'Select Category'}</span>
            </div>
            <ChevronDown className={`w-4 h-4 opacity-50 transition-transform duration-300 ${isCatDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isCatDropdownOpen && (
              <>
                {/* Backdrop to close on click outside */}
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsCatDropdownOpen(false)} 
                />
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 4, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute top-full left-0 right-0 z-20 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden py-1"
                >
                  <button
                    onClick={() => { setSelectedCategory('all'); setIsCatDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-xs font-bold transition-colors ${selectedCategory === 'all' ? 'bg-teal-500 text-white' : 'hover:bg-[var(--bg)]'}`}
                  >
                    All Credentials
                  </button>
                  {categories.map(cat => (
                    <div 
                      key={cat.id}
                      className={`group/cat flex items-center w-full transition-colors ${selectedCategory === cat.id ? 'bg-teal-500 text-white' : 'hover:bg-[var(--bg)]'}`}
                    >
                      <button
                        onClick={() => { setSelectedCategory(cat.id); setIsCatDropdownOpen(false); }}
                        className="flex-1 text-left px-4 py-3 text-xs font-bold"
                      >
                        {cat.name}
                      </button>
                      <div className="flex items-center gap-1 pr-2 opacity-0 group-hover/cat:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => handleEditCategory(e, cat)}
                          className={`p-1.5 rounded-lg transition-colors ${selectedCategory === cat.id ? 'hover:bg-white/20' : 'hover:bg-[var(--border)]'}`}
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteCategory(e, cat.id)}
                          className={`p-1.5 rounded-lg transition-colors ${selectedCategory === cat.id ? 'hover:bg-red-400' : 'hover:bg-red-500/10 text-red-500'}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => { setSelectedCategory('uncategorized'); setIsCatDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-xs font-bold transition-colors ${selectedCategory === 'uncategorized' ? 'bg-teal-500 text-white' : 'hover:bg-[var(--bg)]'}`}
                  >
                    Uncategorized
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Grouped Password List */}
      <div className="space-y-8">
        {groupedPasswords.length === 0 ? (
          <div className="card py-20 text-center opacity-60">
            <p className="text-5xl mb-4">🛡️</p>
            <p className="font-bold text-lg">Your vault is ready</p>
            <p className="text-sm mt-1 max-w-xs mx-auto">Store your passwords, recovery codes, and security notes with zero-knowledge encryption.</p>
          </div>
        ) : (
          groupedPasswords.map(group => (
            <div key={group.id} className="space-y-4">
              <button 
                onClick={() => toggleCategory(group.id)}
                className="flex items-center gap-2 group w-full text-left"
              >
                <div className="p-1 rounded bg-[var(--border)] group-hover:bg-[var(--primary)]/20 transition-colors">
                  {collapsedCategories[group.id] ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
                <h3 className="text-xs font-bold uppercase tracking-widest opacity-60 flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-[var(--primary)]" />
                  {group.name}
                  <span className="text-[10px] font-medium bg-[var(--border)] px-1.5 py-0.5 rounded-full">{group.items.length}</span>
                </h3>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </button>

              {!collapsedCategories[group.id] && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                  {group.items.map(p => {
                    const isRevealed = revealed.has(p.id)
                    const isBackupRevealed = revealedBackups.has(p.id)
                    const decPwd = isRevealed ? getDecrypted(p.encrypted_password) : '••••••••••••'
                    const decBackup = isBackupRevealed ? getDecrypted(p.backup_codes) : ''
                    
                    return (
                      <div key={p.id} className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[var(--card)] to-[var(--bg)]/50 border border-[var(--border)] hover:border-teal-500/50 transition-all flex flex-col gap-4 min-w-0 shadow-sm">
                        <div className="flex justify-between items-start gap-2 min-w-0">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-[15px] sm:text-lg truncate tracking-tight">{p.website}</h4>
                            <div className="flex items-center gap-2 mt-0.5 min-w-0">
                              <span className="text-[12px] sm:text-sm opacity-50 truncate font-medium">{p.username}</span>
                              <button onClick={() => copyToClipboard(p.username)} className="p-1.5 text-teal-500 bg-teal-500/5 rounded-lg active:scale-90 transition-transform shrink-0">
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => { setEditData(p); setFormOpen(true) }} className="p-2 text-slate-400 hover:text-teal-500 transition-colors">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Password Field */}
                        <div className="bg-white dark:bg-slate-800/40 p-3 rounded-2xl border border-[var(--border)] flex items-center justify-between gap-4 shadow-inner min-w-0 overflow-hidden">
                          <div className="flex-1 min-w-0">
                            <span className="text-[8px] font-black uppercase opacity-20 tracking-tighter block mb-0.5">Security Key</span>
                            <span className={`text-sm sm:text-base block truncate ${isRevealed ? 'font-mono' : 'tracking-widest sm:tracking-[0.2em] font-black opacity-60'}`}>
                              {decPwd}
                            </span>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => toggleReveal(p.id)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl shadow-sm transition-all">
                              {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button onClick={() => isRevealed ? copyToClipboard(decPwd) : toast.error("Reveal password to copy")} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl shadow-sm transition-all">
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Backup Codes Section */}
                        {p.backup_codes && (
                          <div className="bg-teal-500/5 border border-teal-500/10 rounded-2xl p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] uppercase font-black text-teal-500/40 tracking-widest flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4" /> Recovery codes
                              </span>
                              <button 
                                onClick={() => toggleRevealBackup(p.id)}
                                className="text-[10px] font-bold text-teal-500 bg-teal-500/10 px-2 py-1 rounded-lg"
                              >
                                {isBackupRevealed ? 'Lock' : 'Reveal'}
                              </button>
                            </div>
                            {isBackupRevealed && (
                              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="text-[11px] font-mono whitespace-pre-wrap leading-relaxed opacity-80 mb-3 bg-white/50 dark:bg-black/20 p-2 rounded-xl">
                                  {decBackup}
                                </div>
                                <button onClick={() => copyToClipboard(decBackup)} className="w-full py-2 bg-teal-500 text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 active:scale-95 transition-all">
                                  <Copy className="w-3.5 h-3.5" /> Copy Recovery Keys
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {p.notes && (
                          <div className="p-3 bg-slate-500/5 rounded-xl text-[10px] italic opacity-50 border border-dashed border-slate-500/10">
                            {p.notes}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <PasswordForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={fetchAll}
        masterPassword={masterPassword}
        editData={editData}
      />
    </div>
  )
}
