import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, Eye, EyeOff, Lock, Unlock, Copy, Download, Trash2, Pencil,
  FolderOpen, ChevronDown, ChevronRight, Search, ShieldCheck, Key,
  CheckCircle2, ShieldAlert, Activity, Check, Shield
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
  const [expandedCategories, setExpandedCategories] = useState({})
  
  // Clipboard copy state mapping for checkmarks
  const [copiedId, setCopiedId] = useState(null)

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

  const copyToClipboard = (text, customMsg = "Copied to clipboard", id = null) => {
    navigator.clipboard.writeText(text)
    toast.success(customMsg, { icon: '📋' })
    if (id) {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
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
    setExpandedCategories(prev => ({ ...prev, [catId]: !prev[catId] }))
  }

  // Calculate statistics for security score
  const totalEntries = passwords.length
  const weakPasswordsCount = useMemo(() => {
    return passwords.filter(p => {
      const dec = getDecrypted(p.encrypted_password)
      return dec.length < 8 || !/[A-Z]/.test(dec) || !/[0-9]/.test(dec)
    }).length
  }, [passwords, masterPassword])

  const healthScore = totalEntries > 0 
    ? Math.round(((totalEntries - weakPasswordsCount) / totalEntries) * 100)
    : 100

  if (status === 'loading') {
    return (
      <div className="p-12 text-center opacity-70 flex flex-col items-center justify-center gap-4 min-h-[400px]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full flex items-center justify-center"
        >
          <Lock className="w-5 h-5 text-[var(--primary)]" />
        </motion.div>
        <p className="font-semibold text-sm tracking-wide text-[var(--text)]">Securing connection to encrypted vault...</p>
      </div>
    )
  }

  if (status === 'setup') {
    return (
      <div className="relative min-h-[70vh] flex items-center justify-center p-4">
        {/* Glow decoration */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-emerald-500/10 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-teal-500/10 blur-[80px] pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md card p-8 space-y-6 shadow-2xl relative overflow-hidden"
        >
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-inner border border-emerald-500/20">
              <Shield className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold text-[var(--text)]">Initialize Your Vault</h2>
            <p className="text-xs text-[var(--text-muted)] font-medium max-w-[280px]">Create a master password to encrypt your credentials locally. <br/><strong className="text-red-500 font-semibold">Warning:</strong> This cannot be reset.</p>
          </div>
          <form onSubmit={handleSetup} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Master Key</label>
              <input
                type="password"
                autoFocus
                required
                placeholder="Create Master Password"
                value={masterPassword}
                onChange={e => setMasterPassword(e.target.value)}
                className="input text-center tracking-[0.3em] font-bold text-lg"
              />
            </div>
            <button type="submit" className="btn-primary w-full py-4 text-sm font-bold uppercase tracking-widest bg-gradient-to-r from-emerald-500 to-teal-600 border-none shadow-lg shadow-emerald-500/20">
              Initialize Vault
            </button>
          </form>
        </motion.div>
      </div>
    )
  }

  if (status === 'locked') {
    return (
      <div className="relative min-h-[70vh] flex items-center justify-center p-4">
        {/* Glow decoration */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-indigo-500/10 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-purple-500/10 blur-[80px] pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md card p-8 space-y-6 shadow-2xl relative overflow-hidden"
        >
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shadow-inner border border-indigo-500/20">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-extrabold text-[var(--text)]">Vault Locked</h2>
            <p className="text-xs text-[var(--text-muted)] font-medium">Your credentials are encrypted. Enter master password to unlock.</p>
          </div>
          <form onSubmit={handleUnlock} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Master Password</label>
              <input
                type="password"
                autoFocus
                required
                placeholder="••••••••"
                value={masterPassword}
                onChange={e => setMasterPassword(e.target.value)}
                className="input text-center tracking-[0.3em] font-bold text-lg"
              />
            </div>
            <button type="submit" className="btn-primary w-full py-4 flex items-center justify-center gap-3 text-sm font-bold uppercase tracking-widest">
              <Unlock className="w-4 h-4" /> Unlock Vault
            </button>
          </form>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      
      {/* Vault Health Dashboard (iOS style stats) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div 
          whileHover={{ y: -2 }}
          className="card p-5 relative overflow-hidden group border-[var(--border)] bg-[var(--card)] shadow-sm"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShieldCheck className="w-12 h-12 text-[var(--primary)]" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-[var(--text-muted)]">Encrypted Credentials</p>
          <p className="font-extrabold text-3xl text-[var(--text)]">{totalEntries}</p>
          <div className="mt-2 text-[10px] text-[var(--text-muted)] font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> AES-256 local encryption active
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          className="card p-5 relative overflow-hidden group border-[var(--border)] bg-[var(--card)] shadow-sm"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShieldAlert className="w-12 h-12 text-amber-500" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-[var(--text-muted)]">Weak Passwords</p>
          <p className={`font-extrabold text-3xl ${weakPasswordsCount > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
            {weakPasswordsCount}
          </p>
          <div className="mt-2 text-[10px] text-[var(--text-muted)] font-medium">
            Passwords under 8 chars or missing numbers
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          className="card p-5 relative overflow-hidden group border-none bg-gradient-to-br from-indigo-500/20 to-[var(--primary)]/10 shadow-sm"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="w-12 h-12 text-[var(--primary)]" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-[var(--text-muted)]">Vault Security Health</p>
          <div className="flex items-end gap-2">
            <p className="font-extrabold text-3xl text-[var(--primary)]">{healthScore}%</p>
            <p className="text-[10px] mb-1.5 font-bold text-[var(--text-muted)]">Health Score</p>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-black/10 dark:bg-white/5 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${healthScore}%` }}
              transition={{ duration: 1.2, ease: "circOut" }}
              className="h-full rounded-full bg-[var(--primary)]"
            />
          </div>
        </motion.div>
      </div>

      {/* Control panel and searching */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between card p-3 border-[var(--border)] shadow-sm">
        <div className="relative w-full sm:w-72 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] opacity-50 group-focus-within:text-[var(--primary)] transition-colors" />
          <input 
            type="text"
            placeholder="Search accounts or sites..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input pl-11 h-11 text-sm font-semibold"
          />
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Custom dropdown for categories */}
          <div className="relative z-30 flex-1 sm:flex-none">
            <button
              onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)}
              className="flex items-center justify-between gap-2 sm:gap-3 w-full sm:w-48 bg-black/5 dark:bg-white/5 border border-[var(--border)] rounded-2xl px-3 sm:px-4 py-2.5 text-xs font-bold transition-all hover:bg-black/10 dark:hover:bg-white/10"
            >
              <div className="flex items-center gap-2 truncate">
                <FolderOpen className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
                <span className="truncate">
                  {selectedCategory === 'all' ? 'All Folders' : selectedCategory === 'uncategorized' ? 'Uncategorized' : categories.find(c => c.id === selectedCategory)?.name || 'Folder'}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 opacity-50 transition-transform shrink-0 ${isCatDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isCatDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsCatDropdownOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -5, scale: 0.98 }}
                    animate={{ opacity: 1, y: 4, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.98 }}
                    className="absolute right-0 top-full w-56 z-20 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden py-1.5 backdrop-blur-xl"
                  >
                    <button
                      onClick={() => { setSelectedCategory('all'); setIsCatDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors ${selectedCategory === 'all' ? 'bg-[var(--primary)] text-white' : 'hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text)]'}`}
                    >
                      All Credentials
                    </button>
                    {categories.map(cat => (
                      <div 
                        key={cat.id}
                        className={`group/cat flex items-center w-full transition-colors ${selectedCategory === cat.id ? 'bg-[var(--primary)] text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                      >
                        <button
                          onClick={() => { setSelectedCategory(cat.id); setIsCatDropdownOpen(false); }}
                          className="flex-1 text-left px-4 py-2.5 text-xs font-bold truncate"
                        >
                          {cat.name}
                        </button>
                        <div className="flex items-center gap-1 pr-2 shrink-0">
                          <button 
                            onClick={(e) => handleEditCategory(e, cat)}
                            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
                          >
                            <Pencil className="w-3 h-3 text-[var(--text-muted)]" />
                          </button>
                          <button 
                            onClick={(e) => handleDeleteCategory(e, cat.id)}
                            className="p-1 rounded hover:bg-red-500/20 text-red-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => { setSelectedCategory('uncategorized'); setIsCatDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors ${selectedCategory === 'uncategorized' ? 'bg-[var(--primary)] text-white' : 'hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text)]'}`}
                    >
                      Uncategorized
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="h-8 w-[1px] bg-[var(--border)] hidden sm:block" />

          {/* Export and Add buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={handleExport} 
              className="p-2.5 rounded-2xl border border-[var(--border)] bg-black/5 dark:bg-white/5 hover:border-[var(--primary)] transition-all"
              title="Secure Excel Export"
            >
              <Download className="w-4 h-4 text-[var(--text-muted)]" />
            </button>
            <button 
              onClick={() => { setEditData(null); setFormOpen(true) }} 
              className="btn-primary py-2.5 px-3 sm:px-4 text-xs uppercase tracking-wider flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">Add Entry</span>
            </button>
          </div>
        </div>
      </div>



      {/* Locked Trigger Header Option */}
      <div className="flex justify-end pr-2">
        <button 
          onClick={() => { setStatus('locked'); setMasterPassword(''); setPasswords([]); }} 
          className="text-xs font-semibold text-[var(--text-muted)] hover:text-red-500 flex items-center gap-1.5 transition-colors"
        >
          <Lock className="w-3.5 h-3.5" /> Lock Vault
        </button>
      </div>

      {/* Grouped Password List */}
      <div className="space-y-6">
        {groupedPasswords.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card py-16 text-center border-[var(--border)] shadow-sm"
          >
            <div className="w-16 h-16 bg-slate-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[var(--text-muted)]">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <p className="font-bold text-lg text-[var(--text)]">Your secure vault is empty</p>
            <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto mb-6">
              Create your first password entry. It will be encrypted immediately using your master key.
            </p>
            <button 
              onClick={() => { setEditData(null); setFormOpen(true) }}
              className="btn-primary text-xs uppercase tracking-wider px-6 py-2.5"
            >
              Add Entry
            </button>
          </motion.div>
        ) : (
          groupedPasswords.map(group => (
            <div key={group.id} className="space-y-3">
              <button 
                onClick={() => toggleCategory(group.id)}
                className="flex items-center gap-2 group w-full text-left"
              >
                <div className="p-1 rounded-lg bg-black/5 dark:bg-white/5 border border-[var(--border)] group-hover:bg-[var(--primary)]/20 transition-colors">
                  {expandedCategories[group.id] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5 text-[var(--primary)]" />
                  {group.name}
                  <span className="text-[9px] font-bold bg-black/10 dark:bg-white/10 text-[var(--text-muted)] px-1.5 py-0.5 rounded-full shrink-0">
                    {group.items.length}
                  </span>
                </h3>
                <div className="flex-1 h-[1px] bg-[var(--border)]" />
              </button>

              {expandedCategories[group.id] && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatePresence mode="popLayout">
                    {group.items.map(p => {
                      const isRevealed = revealed.has(p.id)
                      const isBackupRevealed = revealedBackups.has(p.id)
                      const decPwd = isRevealed ? getDecrypted(p.encrypted_password) : '••••••••••••'
                      const decBackup = isBackupRevealed ? getDecrypted(p.backup_codes) : ''
                      
                      return (
                        <motion.div 
                          key={p.id}
                          layout
                          initial={{ opacity: 0, scale: 0.97 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.97 }}
                          className="card p-5 border border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/40 transition-all flex flex-col gap-4 shadow-sm"
                        >
                          <div className="flex justify-between items-start gap-2 min-w-0">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-extrabold text-[15px] text-[var(--text)] truncate tracking-tight">{p.website}</h4>
                              <div className="flex items-center gap-2 mt-1 min-w-0">
                                <span className="text-[12px] opacity-60 truncate font-semibold text-[var(--text-muted)]">{p.username}</span>
                                <button 
                                  onClick={() => copyToClipboard(p.username, "Username copied!", `usr-${p.id}`)} 
                                  className="p-1 text-[var(--primary)] bg-[var(--primary)]/10 rounded-lg hover:scale-105 active:scale-95 transition-all shrink-0"
                                >
                                  {copiedId === `usr-${p.id}` ? <Check className="w-3.5 h-3.5 stroke-[3.5]" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                            
                            <div className="flex gap-1 shrink-0">
                              <button onClick={() => { setEditData(p); setFormOpen(true) }} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--primary)]">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Password Field */}
                          <div className="bg-black/10 dark:bg-white/5 p-3 rounded-2xl border border-[var(--border)] flex items-center justify-between gap-4 shadow-inner min-w-0 overflow-hidden">
                            <div className="flex-1 min-w-0">
                              <span className="text-[8px] font-bold uppercase opacity-35 tracking-wider block mb-0.5 text-[var(--text-muted)]">Credential Key</span>
                              <span className={`text-sm block truncate ${isRevealed ? 'font-mono' : 'tracking-widest font-black opacity-60'}`}>
                                {decPwd}
                              </span>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button onClick={() => toggleReveal(p.id)} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-all text-[var(--text-muted)]">
                                {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                              <button 
                                onClick={() => isRevealed ? copyToClipboard(decPwd, "Password copied!", `pwd-${p.id}`) : toast.error("Reveal password to copy")} 
                                className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-all text-[var(--text-muted)]"
                              >
                                {copiedId === `pwd-${p.id}` ? <Check className="w-4 h-4 text-emerald-500 stroke-[3.5]" /> : <Copy className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Backup Codes Section */}
                          {p.backup_codes && (
                            <div className="bg-[var(--primary)]/5 border border-[var(--primary)]/10 rounded-2xl p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] uppercase font-bold text-[var(--primary)] tracking-widest flex items-center gap-1.5">
                                  <ShieldCheck className="w-3.5 h-3.5" /> 2FA Backup keys
                                </span>
                                <button 
                                  onClick={() => toggleRevealBackup(p.id)}
                                  className="text-[10px] font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-1 rounded-lg"
                                >
                                  {isBackupRevealed ? 'Lock' : 'Reveal'}
                                </button>
                              </div>
                              {isBackupRevealed && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="space-y-2"
                                >
                                  <div className="text-[11px] font-mono whitespace-pre-wrap leading-relaxed opacity-85 bg-black/10 dark:bg-black/40 p-2.5 rounded-xl border border-[var(--border)]">
                                    {decBackup}
                                  </div>
                                  <button onClick={() => copyToClipboard(decBackup, "Backup codes copied!")} className="w-full py-2 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 shadow-sm">
                                    <Copy className="w-3.5 h-3.5" /> Copy Recovery Keys
                                  </button>
                                </motion.div>
                              )}
                            </div>
                          )}

                          {p.notes && (
                            <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl text-[11px] font-medium italic opacity-60 border border-dashed border-[var(--border)] text-[var(--text-muted)]">
                              {p.notes}
                            </div>
                          )}
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
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
