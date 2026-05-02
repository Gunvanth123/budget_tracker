import { useState, useEffect, useCallback, useMemo } from 'react'
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
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--primary)] flex items-center justify-center text-white shadow-lg shadow-[var(--primary)]/30">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Password Vault</h2>
            <p className="text-xs opacity-60">AES-256 Military-Grade Encryption</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative group flex-1 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40 group-focus-within:opacity-100" />
            <input 
              type="text" 
              placeholder="Search vault..." 
              className="input pl-9 pr-4 py-2 text-sm w-full md:w-48"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button onClick={handleExport} className="btn-secondary p-2.5 rounded-xl" title="Export Encrypted Excel">
            <Download className="w-5 h-5" />
          </button>
          <button onClick={() => { setEditData(null); setFormOpen(true) }} className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl shadow-lg shadow-[var(--primary)]/20">
            <Plus className="w-4 h-4" /> Add Security Entry
          </button>
          <button onClick={() => { setStatus('locked'); setMasterPassword(''); setPasswords([]); }} className="p-2.5 opacity-50 hover:opacity-100 hover:text-red-500 transition-colors" title="Lock vault">
            <Lock className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
            selectedCategory === 'all' 
              ? 'bg-[var(--primary)] border-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/30' 
              : 'bg-[var(--card)] border-[var(--border)] opacity-60 hover:opacity-100'
          }`}
        >
          All Credentials
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id.toString())}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
              selectedCategory === cat.id.toString()
                ? 'bg-[var(--primary)] border-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/30' 
                : 'bg-[var(--card)] border-[var(--border)] opacity-60 hover:opacity-100'
          }`}
          >
            {cat.name}
          </button>
        ))}
        <button
          onClick={() => setSelectedCategory('uncategorized')}
          className={`px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
            selectedCategory === 'uncategorized' 
              ? 'bg-[var(--primary)] border-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/30' 
              : 'bg-[var(--card)] border-[var(--border)] opacity-60 hover:opacity-100'
          }`}
        >
          Uncategorized
        </button>
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in fade-in duration-300">
                  {group.items.map(p => {
                    const isRevealed = revealed.has(p.id)
                    const isBackupRevealed = revealedBackups.has(p.id)
                    const decPwd = isRevealed ? getDecrypted(p.encrypted_password) : '••••••••••••'
                    const decBackup = isBackupRevealed ? getDecrypted(p.backup_codes) : ''
                    
                    return (
                      <div key={p.id} className="card p-5 hover:border-[var(--primary)] transition-all group relative overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                          <div className="min-w-0">
                            <h4 className="font-bold text-lg truncate pr-16">{p.website}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm opacity-70 truncate font-medium">{p.username}</span>
                              <button onClick={() => copyToClipboard(p.username)} className="p-1 hover:text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setEditData(p); setFormOpen(true) }} className="p-2 opacity-40 hover:opacity-100 hover:text-[var(--primary)] transition-all">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(p.id)} className="p-2 opacity-40 hover:opacity-100 hover:text-red-500 transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Password Field */}
                        <div className="bg-[var(--bg)] p-3 rounded-xl border border-[var(--border)] flex items-center justify-between mb-4">
                          <div className="flex-1 flex flex-col min-w-0">
                            <span className="text-[10px] uppercase font-bold opacity-40 mb-0.5">Password</span>
                            <span className={`text-sm truncate ${isRevealed ? 'font-mono' : 'tracking-[0.2em] font-bold'}`}>
                              {decPwd}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => toggleReveal(p.id)} className="p-2 hover:bg-[var(--card)] rounded-lg transition-colors">
                              {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button onClick={() => isRevealed ? copyToClipboard(decPwd) : toast.error("Reveal password to copy")} className="p-2 hover:bg-[var(--card)] rounded-lg transition-colors">
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Backup Codes Section */}
                        {p.backup_codes && (
                          <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] uppercase font-bold text-indigo-500/70 flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5" /> Recovery Codes
                              </span>
                              <button 
                                onClick={() => toggleRevealBackup(p.id)}
                                className="text-[10px] font-bold text-indigo-500 hover:underline"
                              >
                                {isBackupRevealed ? 'Hide Codes' : 'Show Full'}
                              </button>
                            </div>
                            <div className={`text-[11px] font-mono whitespace-pre-wrap transition-all overflow-hidden ${isBackupRevealed ? 'max-h-96 opacity-100' : 'max-h-8 opacity-40 blur-[1px]'}`}>
                              {isBackupRevealed ? decBackup : (decBackup.slice(0, 50) + '...')}
                            </div>
                            {isBackupRevealed && (
                              <button onClick={() => copyToClipboard(decBackup)} className="btn-secondary w-full py-1.5 text-[10px] flex items-center justify-center gap-2">
                                <Copy className="w-3 h-3" /> Copy All Codes
                              </button>
                            )}
                          </div>
                        )}

                        {p.notes && (
                          <div className="mt-4 p-3 bg-slate-500/5 rounded-xl text-xs opacity-60">
                            <p className="font-bold mb-1 uppercase text-[9px] tracking-wider">Secure Note</p>
                            <p>{p.notes}</p>
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
