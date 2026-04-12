import { useState, useEffect, useCallback } from 'react'
import { Plus, Eye, EyeOff, Lock, Unlock, Copy, Download, Trash2, Pencil } from 'lucide-react'
import { passwordsApi } from '../../api/client'
import toast from 'react-hot-toast'
import CryptoJS from 'crypto-js'
import PasswordForm from './PasswordForm'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

export default function PasswordManager() {
  const [status, setStatus] = useState('loading') // loading, setup, locked, unlocked
  const [masterPassword, setMasterPassword] = useState('')
  const [passwords, setPasswords] = useState([])
  
  // UI States
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState(null)
  const [revealed, setRevealed] = useState(new Set())

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

  const fetchPasswords = async () => {
    try {
      const data = await passwordsApi.getAll()
      setPasswords(data)
    } catch {
      toast.error("Failed to fetch passwords")
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
      fetchPasswords()
    } catch {
      toast.error("Failed to setup master password")
    }
  }

  const handleUnlock = async (e) => {
    e.preventDefault()
    try {
      await passwordsApi.verify(masterPassword)
      setStatus('unlocked')
      fetchPasswords()
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

  const getDecrypted = (encrypted) => {
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
      fetchPasswords()
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
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Passwords')

      // Fetch and Add Logo
      try {
        const response = await fetch('/logo.png')
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer()
          const logoId = workbook.addImage({
            buffer: arrayBuffer,
            extension: 'png',
          })
          worksheet.addImage(logoId, {
            tl: { col: 0, row: 0 },
            ext: { width: 160, height: 80 }
          })
          
          worksheet.getRow(1).height = 30
          worksheet.getRow(2).height = 30
          worksheet.getRow(3).height = 30
        }
      } catch (e) {
        console.error('Failed to load logo', e)
      }

      // Headers
      const headerRow = worksheet.getRow(4)
      headerRow.values = ['Website / App', 'Username / Email', 'Password', 'Notes']
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00A19B' } }
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      })

      // Data
      let currentRow = 5
      passwords.forEach(entry => {
        const row = worksheet.getRow(currentRow)
        const decPwd = getDecrypted(entry.encrypted_password)
        row.values = [
          entry.website,
          entry.username,
          decPwd,
          entry.notes || ''
        ]
        currentRow++
      })

      worksheet.autoFilter = `A4:D${currentRow - 1}`
      worksheet.columns = [{ width: 25 }, { width: 30 }, { width: 25 }, { width: 40 }]

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(blob, `passwords_export.xlsx`)
      toast.success('Passwords exported successfully!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to generate Excel file')
    }
  }

  if (status === 'loading') {
    return <div className="p-8 text-center opacity-70 flex items-center justify-center gap-2"><Lock className="w-4 h-4 animate-pulse"/> Checking secure vault...</div>
  }

  if (status === 'setup') {
    return (
      <div className="max-w-md mx-auto mt-10 card p-6 space-y-5 shadow-xl">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 bg-[var(--primary)] rounded-full flex items-center justify-center text-white mb-2 shadow-lg shadow-[var(--primary)]/30">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">Secure Password Vault</h2>
          <p className="text-sm opacity-70">Create a master password to encrypt your vault. This password cannot be recovered if lost.</p>
        </div>
        <form onSubmit={handleSetup} className="space-y-4 pt-4">
          <input
            type="password"
            autoFocus
            required
            placeholder="Create Master Password"
            value={masterPassword}
            onChange={e => setMasterPassword(e.target.value)}
            className="input w-full p-3 text-center tracking-[0.2em] font-bold"
          />
          <button type="submit" className="btn-primary w-full py-3">Initialize Vault</button>
        </form>
      </div>
    )
  }

  if (status === 'locked') {
    return (
      <div className="max-w-md mx-auto mt-10 card p-6 space-y-5 shadow-2xl">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 bg-slate-800 dark:bg-slate-700 rounded-full flex items-center justify-center text-white mb-2 shadow-[0_0_20px_rgba(0,0,0,0.2)] dark:shadow-none">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">Vault Locked</h2>
          <p className="text-sm opacity-70">Enter your master password to decrypt your credentials locally.</p>
        </div>
        <form onSubmit={handleUnlock} className="space-y-4 pt-4">
          <input
            type="password"
            autoFocus
            required
            placeholder="Master Password"
            value={masterPassword}
            onChange={e => setMasterPassword(e.target.value)}
            className="input w-full p-3 text-center tracking-[0.2em] font-bold"
          />
          <button type="submit" className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            <Unlock className="w-4 h-4" /> Unlock Vault
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--card)] p-4 rounded-2xl border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)] flex items-center justify-center text-white shadow-md shadow-[var(--primary)]/20">
            <Unlock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold">Password Manager</h2>
            <p className="text-xs opacity-70">End-to-End Encrypted Vault</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm px-3">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => { setEditData(null); setFormOpen(true) }} className="btn-primary flex items-center gap-2 px-4 shadow-lg shadow-[var(--primary)]/20">
            <Plus className="w-4 h-4" /> Add Login
          </button>
          <button onClick={() => { setStatus('locked'); setMasterPassword(''); setPasswords([]); setRevealed(new Set()); }} className="ml-2 p-2 opacity-50 hover:opacity-100 hover:text-red-500 transition-colors" title="Lock vault">
            <Lock className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {passwords.length === 0 ? (
          <div className="py-16 text-center opacity-60">
            <p className="text-4xl mb-3">🔑</p>
            <p className="font-medium">Your vault is empty</p>
            <p className="text-sm mt-1">Store your first secure credential</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            <div className="hidden md:grid items-center gap-4 px-5 py-3 text-xs font-bold uppercase tracking-wide bg-[var(--bg)] opacity-70"
                 style={{ gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1.5fr) minmax(0,2fr) 90px' }}>
              <div>Website</div>
              <div>Username</div>
              <div>Password</div>
              <div className="text-right">Actions</div>
            </div>

            {passwords.map(p => {
              const isRevealed = revealed.has(p.id)
              const decPwd = isRevealed ? getDecrypted(p.encrypted_password) : '••••••••••••'
              
              return (
                <div key={p.id} className="grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)_minmax(0,2fr)_90px] gap-3 md:gap-4 items-center px-4 md:px-5 py-4 transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{p.website}</p>
                    {p.notes && <p className="text-xs opacity-60 truncate mt-0.5">{p.notes}</p>}
                  </div>
                  
                  <div className="flex items-center gap-2 min-w-0 group">
                    <p className="text-sm truncate font-medium opacity-90">{p.username}</p>
                    <button onClick={() => copyToClipboard(p.username)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-[var(--primary)] transition-all">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="bg-[var(--bg)] px-3 py-1.5 rounded-lg flex-1 flex items-center justify-between border border-[var(--border)] overflow-hidden">
                      <span className={`text-sm truncate ${isRevealed ? 'font-mono' : 'tracking-[0.2em] font-bold'}`}>
                        {decPwd}
                      </span>
                      <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                        <button onClick={() => toggleReveal(p.id)} className="p-1 hover:text-[var(--primary)] transition-colors opacity-60 hover:opacity-100">
                          {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button onClick={() => isRevealed ? copyToClipboard(decPwd) : toast.error("Reveal password to copy")} className="p-1 hover:text-[var(--primary)] transition-colors opacity-60 hover:opacity-100">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => { setEditData(p); setFormOpen(true) }} className="p-2 opacity-60 hover:opacity-100 hover:text-[var(--primary)] transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 opacity-60 hover:opacity-100 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <PasswordForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={fetchPasswords}
        masterPassword={masterPassword}
        editData={editData}
      />
    </div>
  )
}
