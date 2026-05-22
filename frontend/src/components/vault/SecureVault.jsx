import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { 
  Shield, Lock, Unlock, Upload, Download, Trash2, Pencil,
  File, FileText, FileImage,
  Loader2, Search,
  CheckCircle2, Settings, ExternalLink, Info,
  FolderOpen, ChevronDown, ChevronRight, Plus, Eye, X, Check, Cloud
} from 'lucide-react'
import { vaultApi, passwordsApi, usageApi } from '../../api/client'
import toast from 'react-hot-toast'
import CryptoJS from 'crypto-js'
import VaultUploadModal from './VaultUploadModal'

export default function SecureVault() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [status, setStatus] = useState('loading') // loading, locked, unlocked
  const [vaultStatus, setVaultStatus] = useState({ is_gdrive_connected: false })
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false)
  const [gdriveConfigured, setGdriveConfigured] = useState(null) // null = loading, true/false = result
  const [masterPassword, setMasterPassword] = useState('')
  const [files, setFiles] = useState([])
  const [categories, setCategories] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all') // 'all', cat_id, or 'uncategorized'
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [previewData, setPreviewData] = useState({ isOpen: false, url: '', filename: '', mimetype: '' })
  const [collapsedCategories, setCollapsedCategories] = useState({})
  
  // Multi-select states
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedFileIds, setSelectedFileIds] = useState(new Set())
  const [isExporting, setIsExporting] = useState(false)

  const checkVaultStatus = useCallback(async () => {
    try {
      const [pStatus, vStatus, configStatus] = await Promise.all([
        passwordsApi.status(),
        vaultApi.status(),
        vaultApi.getConfigStatus()
      ])
      setVaultStatus(vStatus)
      setGdriveConfigured(configStatus.is_configured)
      setStatus('locked')
    } catch (e) {
      toast.error("Security system unreachable")
    }
  }, [])

  const isHandlingCallback = useRef(false)

  const pollMigrationStatus = useCallback(async (tid) => {
    const interval = setInterval(async () => {
      try {
        const status = await vaultApi.migrationStatus()
        
        if (status.status === 'running' || status.status === 'pending') {
          const progress = status.total > 0 ? ` (${status.current}/${status.total})` : ''
          toast.loading(`Migrating your secure data...${progress}`, { id: tid })
        } else if (status.status === 'completed') {
          clearInterval(interval)
          toast.success(status.message || "Migration complete!", { id: tid })
          setIsConnecting(false)
          fetchAll()
          // Refresh vault status to show connection
          vaultApi.status().then(setVaultStatus)
        } else if (status.status === 'error') {
          clearInterval(interval)
          toast.error(`Migration failed: ${status.message}`, { id: tid })
          setIsConnecting(false)
        }
      } catch (e) {
        console.error("Polling error:", e)
      }
    }, 1500)

    return () => clearInterval(interval)
  }, [])

  const handleGDriveCallback = useCallback(async (code) => {
    if (isHandlingCallback.current) return
    isHandlingCallback.current = true

    setIsConnecting(true)
    const tid = toast.loading("Finalizing Google Drive connection...")
    try {
      const migrate = sessionStorage.getItem('gdrive_migrate') === 'true'
      sessionStorage.removeItem('gdrive_migrate')
      
      const res = await vaultApi.connectGDrive(code, migrate)
      
      // Clear the code from URL immediately
      setSearchParams({})

      if (res.is_migrating) {
        // Start polling for progress
        pollMigrationStatus(tid)
      } else {
        toast.success(res.message || "Google Drive linked successfully!", { id: tid })
        setIsConnecting(false)
        const vStatus = await vaultApi.status()
        setVaultStatus(vStatus)
        if (status === 'unlocked') fetchAll()
      }
    } catch (err) {
      toast.error("Failed to link Google Drive", { id: tid })
      setIsConnecting(false)
    } finally {
      isHandlingCallback.current = false
    }
  }, [setSearchParams, status, pollMigrationStatus])

  useEffect(() => {
    checkVaultStatus()
  }, [checkVaultStatus])

  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      handleGDriveCallback(code)
    }
  }, [searchParams, handleGDriveCallback])

  const fetchAll = async () => {
    try {
      const [fData, cData] = await Promise.all([
        vaultApi.getAll(),
        vaultApi.getCategories()
      ])
      setFiles(fData)
      setCategories(cData)
    } catch {
      toast.error("Failed to load your vault")
    }
  }

  const handleUnlock = async (e) => {
    e.preventDefault()
    try {
      await passwordsApi.verify(masterPassword)
      setStatus('unlocked')
      fetchAll()
      usageApi.track('vault')
      toast.success("Vault decrypted successfully")
    } catch {
      toast.error("Incorrect Master Password")
      setMasterPassword('')
    }
  }

  const handleConnectGDrive = async (migrate = false) => {
    if (!gdriveConfigured) return
    try {
      sessionStorage.setItem('gdrive_migrate', migrate.toString())
      const { url } = await vaultApi.getAuthUrl()
      window.location.href = url
    } catch (err) {
      toast.error("Could not initiate Google Drive connection")
    }
  }

  const handleSwitchGDrive = () => {
    const migrate = confirm("Do you want to MOVE all your current vault files from the old Google account to the new one?\n\n- Click OK to MIGRATE data.\n- Click CANCEL to just switch accounts (old files will stay in the old account).")
    handleConnectGDrive(migrate)
  }

  const decryptFile = async (fileInfo) => {
    const res = await vaultApi.download(fileInfo.id)
    const decrypted = CryptoJS.AES.decrypt(res.encrypted_content, masterPassword)
    
    const typedArray = new Uint8Array(decrypted.sigBytes)
    const words = decrypted.words
    for (let i = 0; i < decrypted.sigBytes; i++) {
      typedArray[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff
    }

    return new Blob([typedArray], { type: res.mimetype })
  }

  const handleDownload = async (fileInfo) => {
    toast.loading("Decrypting...", { id: 'dec' })
    try {
      const blob = await decryptFile(fileInfo)
      saveAs(blob, fileInfo.filename)
      toast.success("Downloaded & Decrypted", { id: 'dec' })
    } catch (err) {
      toast.error("Decryption failed. Wrong key?", { id: 'dec' })
    }
  }

  const handleBulkDownload = async () => {
    let filesToExport = []
    if (selectionMode && selectedFileIds.size > 0) {
      filesToExport = files.filter(f => selectedFileIds.has(f.id))
    } else {
      filesToExport = groupedFiles.flatMap(g => g.files)
    }

    if (filesToExport.length === 0) {
      return toast.error("No files selected or found in current view")
    }

    setIsExporting(true)
    const tid = toast.loading(`Preparing ZIP with ${filesToExport.length} files...`)
    
    try {
      const zip = new JSZip()
      
      for (const file of filesToExport) {
        try {
          const blob = await decryptFile(file)
          const catName = file.category?.name || 'Uncategorized'
          zip.file(`${catName}/${file.filename}`, blob)
        } catch (err) {
          console.error(`Failed to decrypt ${file.filename}`, err)
        }
      }

      const content = await zip.generateAsync({ type: "blob" })
      saveAs(content, `vault_export_${new Date().toISOString().split('T')[0]}.zip`)
      toast.success("Export complete!", { id: tid })
      setSelectionMode(false)
      setSelectedFileIds(new Set())
    } catch (err) {
      toast.error("Bulk export failed", { id: tid })
    } finally {
      setIsExporting(false)
    }
  }

  const toggleFileSelection = (id) => {
    setSelectedFileIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handlePreview = async (fileInfo) => {
    const tid = toast.loading(`Preparing preview for ${fileInfo.filename}...`)
    try {
      const res = await vaultApi.download(fileInfo.id)
      const decrypted = CryptoJS.AES.decrypt(res.encrypted_content, masterPassword)
      
      const typedArray = new Uint8Array(decrypted.sigBytes)
      const words = decrypted.words
      for (let i = 0; i < decrypted.sigBytes; i++) {
        typedArray[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff
      }

      const blob = new Blob([typedArray], { type: res.mimetype })
      const url = URL.createObjectURL(blob)
      setPreviewData({
          isOpen: true,
          url,
          filename: fileInfo.filename,
          mimetype: res.mimetype
      })
      toast.success("Ready to view", { id: tid })
    } catch (err) {
      toast.error("Preview failed", { id: tid })
    }
  }

  const closePreview = () => {
    if (previewData.url) URL.revokeObjectURL(previewData.url)
    setPreviewData({ isOpen: false, url: '', filename: '', mimetype: '' })
  }

  const handleDeleteCategory = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this category? Associated files will become uncategorized.')) return
    try {
      await vaultApi.deleteCategory(id)
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
      await vaultApi.updateCategory(cat.id, newName)
      toast.success('Category updated')
      fetchAll()
    } catch {
      toast.error('Failed to update category')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Permanently delete this file from the secure vault?")) return
    try {
      await vaultApi.delete(id)
      toast.success("File deleted")
      fetchAll()
    } catch {
      toast.error("Delete failed")
    }
  }

  const toggleCategory = (catId) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }))
  }

  const getFileIcon = (mimetype) => {
    if (mimetype.startsWith('image/')) return <FileImage className="w-5 h-5 text-pink-400 dark:text-pink-300" />
    if (mimetype.includes('pdf') || mimetype.includes('text')) return <FileText className="w-5 h-5 text-blue-400 dark:text-blue-300" />
    return <File className="w-5 h-5 text-slate-400" />
  }

  const groupedFiles = useMemo(() => {
    let filtered = files.filter(f => 
      f.filename.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (selectedCategory !== 'all') {
        filtered = filtered.filter(f => {
            if (selectedCategory === 'uncategorized') return !f.category_id
            return f.category_id === parseInt(selectedCategory)
        })
    }

    const groups = {}
    filtered.forEach(file => {
      const catId = file.category_id || 'uncategorized'
      const catName = file.category?.name || 'Uncategorized'
      if (!groups[catId]) {
        groups[catId] = { id: catId, name: catName, files: [] }
      }
      groups[catId].files.push(file)
    })
    return Object.values(groups)
  }, [files, searchQuery, selectedCategory])

  // Count files for dashboard stats
  const totalFiles = files.length
  const totalStorageKB = useMemo(() => {
    return Math.round(files.reduce((sum, f) => sum + (f.size || 0), 0) / 1024)
  }, [files])

  if (status === 'loading' || isConnecting) {
    return (
      <div className="p-12 text-center opacity-70 flex flex-col items-center justify-center gap-4 min-h-[400px]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full flex items-center justify-center"
        >
          <Shield className="w-5 h-5 text-indigo-500" />
        </motion.div>
        <p className="font-semibold text-sm tracking-wide text-[var(--text)]">Connecting to encrypted storage protocols...</p>
      </div>
    )
  }

  if (status === 'locked') {
    return (
      <div className="relative min-h-[70vh] flex items-center justify-center p-4">
        {/* Glow decoration */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-indigo-500/10 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-violet-500/10 blur-[80px] pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md card p-8 space-y-6 shadow-2xl relative overflow-hidden"
        >
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shadow-inner border border-indigo-500/20">
              <Shield className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold text-[var(--text)]">Secure Vault</h2>
            <p className="text-xs text-[var(--text-muted)] font-medium max-w-[280px]">Your documents are end-to-end encrypted. Enter your master password to unlock your storage.</p>
          </div>
          <form onSubmit={handleUnlock} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Master Key</label>
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
            <button type="submit" className="btn-primary w-full py-4 flex items-center justify-center gap-3 text-sm font-bold uppercase tracking-widest bg-gradient-to-r from-indigo-500 to-violet-600 border-none shadow-lg shadow-indigo-500/20">
              <Unlock className="w-4 h-4" /> Unlock Storage
            </button>
          </form>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 relative">
      
      {/* Background ambient glow blobs */}
      <div className="absolute top-0 left-10 w-96 h-96 rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-violet-500/5 blur-[120px] pointer-events-none" />

      {/* Cloud Integration Banner */}
      {!vaultStatus.is_gdrive_connected && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-5 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 overflow-hidden relative card bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent ${
            gdriveConfigured === false ? 'border-amber-500/20 bg-amber-500/5' : 'border-indigo-500/10'
          }`}
        >
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-md shrink-0 border border-black/5 dark:border-white/5">
              {gdriveConfigured === false
                ? <Settings className="w-6 h-6 text-amber-500" />
                : <Cloud className="w-6 h-6 text-indigo-500" />
              }
            </div>
            <div className="space-y-1">
              {gdriveConfigured === false ? (
                <>
                  <h3 className="text-sm font-extrabold text-amber-500">Google Drive Configuration Needed</h3>
                  <p className="text-xs text-[var(--text-muted)] max-w-xl">To enable cloud backup, please configure your client credentials in the backend environment file.</p>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-extrabold text-[var(--text)]">Sync Vault with Google Drive</h3>
                  <p className="text-xs text-[var(--text-muted)] max-w-xl">Store your documents securely in your private cloud. Files are fully encrypted locally before upload.</p>
                </>
              )}
            </div>
          </div>
          {gdriveConfigured !== false && (
            <button
              onClick={() => handleConnectGDrive(false)}
              className="btn-primary py-2.5 px-5 text-xs uppercase tracking-wider bg-gradient-to-r from-indigo-500 to-indigo-600 border-none shrink-0"
            >
              Link Cloud Drive
            </button>
          )}
        </motion.div>
      )}

      {/* Storage Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div 
          whileHover={{ y: -2 }}
          className="card p-5 relative overflow-hidden group border-[var(--border)] bg-[var(--card)] shadow-sm"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <FileText className="w-12 h-12 text-[var(--primary)]" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-[var(--text-muted)]">Encrypted Files</p>
          <p className="font-extrabold text-3xl text-[var(--text)]">{totalFiles}</p>
          <div className="mt-2 text-[10px] text-[var(--text-muted)] font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> E2E Zero-knowledge active
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          className="card p-5 relative overflow-hidden group border-[var(--border)] bg-[var(--card)] shadow-sm"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Cloud className="w-12 h-12 text-indigo-500" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-[var(--text-muted)]">Encrypted Volume</p>
          <p className="font-extrabold text-3xl text-[var(--text)]">
            {totalStorageKB > 1024 ? `${(totalStorageKB / 1024).toFixed(1)} MB` : `${totalStorageKB} KB`}
          </p>
          <div className="mt-2 text-[10px] text-[var(--text-muted)] font-medium">
            Storage consumption in secure database
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          className="card p-5 relative overflow-hidden group border-none bg-gradient-to-br from-indigo-500/20 to-violet-500/10 shadow-sm"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Shield className="w-12 h-12 text-indigo-500" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-[var(--text-muted)]">Cloud Status</p>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2.5 h-2.5 rounded-full ${vaultStatus.is_gdrive_connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <p className="font-extrabold text-lg text-[var(--text)]">
              {vaultStatus.is_gdrive_connected ? "Google Drive Connected" : "Local Sync Only"}
            </p>
          </div>
          <p className="mt-3 text-[10px] text-[var(--text-muted)] font-medium">
            {vaultStatus.is_gdrive_connected ? "Auto-syncing encrypts copy to GDrive App Folder" : "Connect cloud account to sync secure storage"}
          </p>
        </motion.div>
      </div>

      {/* Control panel and searching */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between card p-3 border-[var(--border)] shadow-sm">
        <div className="relative w-full sm:w-72 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] opacity-50 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text"
            placeholder="Search vault documents..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input pl-11 h-11 text-sm font-semibold"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Custom dropdown for categories */}
          <div className="relative z-30 flex-1 sm:flex-none">
            <button
              onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)}
              className="flex items-center justify-between gap-3 w-full sm:w-48 bg-black/5 dark:bg-white/5 border border-[var(--border)] rounded-2xl px-4 py-2.5 text-xs font-bold transition-all hover:bg-black/10 dark:hover:bg-white/10"
            >
              <div className="flex items-center gap-2 truncate">
                <FolderOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
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
                      className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors ${selectedCategory === 'all' ? 'bg-indigo-500 text-white' : 'hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text)]'}`}
                    >
                      All Folders
                    </button>
                    {categories.map(cat => (
                      <div 
                        key={cat.id}
                        className={`group/cat flex items-center w-full transition-colors ${selectedCategory === cat.id ? 'bg-indigo-500 text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
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
                      className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors ${selectedCategory === 'uncategorized' ? 'bg-indigo-500 text-white' : 'hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text)]'}`}
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
              onClick={() => { setSelectionMode(!selectionMode); setSelectedFileIds(new Set()); }}
              className={`p-2.5 rounded-2xl border transition-all ${selectionMode ? 'bg-indigo-500 text-white border-indigo-500' : 'border-[var(--border)] bg-black/5 dark:bg-white/5 hover:border-indigo-500'}`}
              title="Bulk Actions"
            >
              <Check className="w-4 h-4" />
            </button>
            <button 
              onClick={handleBulkDownload} 
              className="p-2.5 rounded-2xl border border-[var(--border)] bg-black/5 dark:bg-white/5 hover:border-indigo-500 transition-all"
              title="Secure ZIP Export"
              disabled={isExporting}
            >
              <Download className={`w-4 h-4 text-[var(--text-muted)] ${isExporting ? 'animate-bounce' : ''}`} />
            </button>
            <button 
              onClick={() => setUploadModalOpen(true)} 
              className="btn-primary py-2.5 text-xs uppercase tracking-wider flex items-center gap-1.5 px-4 bg-gradient-to-r from-indigo-500 to-indigo-600 border-none"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Add Files
            </button>
          </div>
        </div>
      </div>

      {/* Floating Action Button (Mobile) */}
      {createPortal(
        <button 
          onClick={() => setUploadModalOpen(true)}
          className="fixed bottom-20 right-6 w-14 h-14 rounded-full bg-indigo-500 text-white shadow-2xl flex items-center justify-center z-[999] sm:hidden active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </button>,
        document.body
      )}

      {/* Lock Storage Button */}
      <div className="flex justify-end pr-2">
        <button 
          onClick={() => { setStatus('locked'); setMasterPassword(''); setFiles([]); }} 
          className="text-xs font-semibold text-[var(--text-muted)] hover:text-red-500 flex items-center gap-1.5 transition-colors"
        >
          <Lock className="w-3.5 h-3.5" /> Lock Vault
        </button>
      </div>

      {/* Vault Files Groups */}
      <div className="space-y-6">
        {groupedFiles.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card py-16 text-center border-[var(--border)] shadow-sm"
          >
            <div className="w-16 h-16 bg-slate-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[var(--text-muted)]">
              <Shield className="w-8 h-8" />
            </div>
            <p className="font-bold text-lg text-[var(--text)]">Your vault is empty</p>
            <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto mb-6">
              Encrypted storage keeps your files safe. All uploads are encrypted using client-side AES-256 keys.
            </p>
            <button 
              onClick={() => setUploadModalOpen(true)}
              className="btn-primary text-xs uppercase tracking-wider px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 border-none"
            >
              Upload Documents
            </button>
          </motion.div>
        ) : (
          groupedFiles.map(group => (
            <div key={group.id} className="space-y-3">
              <button 
                onClick={() => toggleCategory(group.id)}
                className="flex items-center gap-2 group w-full text-left"
              >
                <div className="p-1 rounded-lg bg-black/5 dark:bg-white/5 border border-[var(--border)] group-hover:bg-indigo-500/20 transition-colors">
                  {collapsedCategories[group.id] ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5 text-indigo-500" />
                  {group.name}
                  <span className="text-[9px] font-bold bg-black/10 dark:bg-white/10 text-[var(--text-muted)] px-1.5 py-0.5 rounded-full shrink-0">
                    {group.files.length}
                  </span>
                </h3>
                <div className="flex-1 h-[1px] bg-[var(--border)]" />
              </button>

              {!collapsedCategories[group.id] && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <AnimatePresence mode="popLayout">
                    {group.files.map(file => {
                      const isSelected = selectedFileIds.has(file.id)
                      return (
                        <motion.div 
                          key={file.id}
                          layout
                          initial={{ opacity: 0, scale: 0.97 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.97 }}
                          onClick={() => selectionMode && toggleFileSelection(file.id)}
                          className={`card p-4 border transition-all flex flex-col gap-4 shadow-sm relative overflow-hidden ${
                            isSelected 
                              ? 'border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10' 
                              : 'border-[var(--border)] bg-[var(--card)] hover:border-indigo-500/40'
                          } ${selectionMode ? 'cursor-pointer select-none' : ''}`}
                        >
                          <div className="flex justify-between items-start gap-2 min-w-0">
                            <div className="flex gap-3 items-center min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm shrink-0 border border-black/5 dark:border-white/5">
                                {getFileIcon(file.mimetype)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-extrabold text-[13px] text-[var(--text)] truncate tracking-tight">{file.filename}</h4>
                                <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-[var(--text-muted)] font-semibold uppercase">
                                  <span>{(file.size / 1024).toFixed(0)} KB</span>
                                  <span>•</span>
                                  <span className="truncate">{new Date(file.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                </div>
                              </div>
                            </div>
                            
                            {!selectionMode && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }} 
                                className="p-1 rounded hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 transition-colors shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}

                            {selectionMode && (
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-[var(--border)] bg-black/5 dark:bg-white/5'
                              }`}>
                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3.5]" />}
                              </div>
                            )}
                          </div>

                          {!selectionMode && (
                            <div className="flex gap-2 shrink-0">
                              <button 
                                onClick={() => handlePreview(file)}
                                className="flex-1 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/10"
                              >
                                <Eye className="w-3.5 h-3.5" /> Quick Look
                              </button>
                              <button 
                                onClick={() => handleDownload(file)}
                                className="flex-1 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--text)] text-[11px] font-bold flex items-center justify-center gap-1.5"
                              >
                                <Download className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Save File
                              </button>
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

      {/* Encryption security advice */}
      <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl flex gap-3 items-start card">
        <Info className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-600 dark:text-amber-400 opacity-90 leading-relaxed">
          <strong>Security Warning:</strong> Budget Tracker Elite Vault implements local decryption key matrices. We do not store your master key. If you lose your master key or forget it, all files in your database and linked cloud folders become permanently scrambled.
        </p>
      </div>

      <VaultUploadModal 
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSaved={fetchAll}
        categories={categories}
        masterPassword={masterPassword}
      />

      {/* Preview overlays */}
      <AnimatePresence>
        {previewData.isOpen && (
          <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePreview}
              className="absolute inset-0 bg-slate-950/95 backdrop-blur-2xl"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-5xl h-[85vh] flex flex-col z-10 p-4"
            >
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-t-3xl border-t border-x border-white/10 backdrop-blur-md">
                <div className="min-w-0 flex-1">
                  <h3 className="text-white font-extrabold text-sm sm:text-base truncate">{previewData.filename}</h3>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-white/40 mt-0.5 truncate">{previewData.mimetype}</p>
                </div>
                
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <button 
                    onClick={() => {
                      const a = document.createElement('a')
                      a.href = previewData.url
                      a.download = previewData.filename
                      a.click()
                    }}
                    className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={closePreview}
                    className="p-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all shadow-lg shadow-red-500/20"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 w-full bg-black/60 rounded-b-3xl border-b border-x border-white/10 flex items-center justify-center overflow-hidden p-6">
                {previewData.mimetype.startsWith('image/') ? (
                  <img src={previewData.url} className="max-w-full max-h-full object-contain rounded-xl" alt="Document Quick Look" />
                ) : previewData.mimetype === 'application/pdf' ? (
                  <iframe src={`${previewData.url}#toolbar=0`} className="w-full h-full border-0 rounded-xl" title="PDF Document Viewer" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-white/50 space-y-4">
                    <FileText className="w-16 h-16 opacity-30 animate-pulse text-indigo-500" />
                    <p className="text-xs font-bold tracking-wide uppercase">Quick Look not supported for this format</p>
                    <button 
                      onClick={() => {
                        const a = document.createElement('a')
                        a.href = previewData.url
                        a.download = previewData.filename
                        a.click()
                      }}
                      className="btn-primary py-2.5 px-6 text-xs uppercase bg-indigo-500 border-none"
                    >
                      Download to View
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
