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
  FolderOpen, ChevronDown, ChevronRight, Plus, Eye, X
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

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    // Removed limit: if (file.size > 5 * 1024 * 1024) return toast.error("Files must be under 5MB")

    setIsUploading(true)
    const reader = new FileReader()
    
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target.result
        const wa = CryptoJS.lib.WordArray.create(arrayBuffer)
        const encrypted = CryptoJS.AES.encrypt(wa, masterPassword).toString()

        const formData = new FormData()
        formData.append('filename', file.name)
        formData.append('mimetype', file.type)
        formData.append('size', file.size)
        formData.append('encrypted_content', encrypted)

        await vaultApi.upload(formData)
        toast.success(`${file.name} encrypted and stored!`)
        fetchFiles()
      } catch (err) {
        toast.error("Encryption failed")
      } finally {
        setIsUploading(false)
      }
    }
    reader.readAsArrayBuffer(file)
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
    // Determine which files to download
    let filesToExport = []
    if (selectionMode && selectedFileIds.size > 0) {
      filesToExport = files.filter(f => selectedFileIds.has(f.id))
    } else {
      // Export current filtered view
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
          // Add to category subfolder
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
    if (mimetype.startsWith('image/')) return <FileImage className="w-5 h-5 text-pink-500" />
    if (mimetype.includes('pdf') || mimetype.includes('text')) return <FileText className="w-5 h-5 text-blue-500" />
    return <File className="w-5 h-5 text-slate-400" />
  }

  const groupedFiles = useMemo(() => {
    let filtered = files.filter(f => 
      f.filename.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Apply category filter if not 'all'
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

  if (status === 'loading' || isConnecting) {
    return <div className="p-12 text-center opacity-50 flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin w-8 h-8 text-indigo-500"/>
      <p className="font-medium">Securing connection to storage protocols...</p>
    </div>
  }

  if (status === 'locked') {
    return (
      <div className="max-w-md mx-auto mt-20 card p-8 space-y-6 shadow-2xl border-t-4 border-[var(--primary)]">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full flex items-center justify-center shadow-inner">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold">Secure Vault Access</h2>
          <p className="text-sm opacity-60">Your files are end-to-end encrypted. Enter your Master Password to decrypt your storage.</p>
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
          <button type="submit" className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 shadow-lg shadow-[var(--primary)]/20">
            <Unlock className="w-5 h-5" /> Open Vault
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="w-full max-w-full space-y-6 overflow-hidden">
      {/* Google Drive Connection Banner */}
      {/* Google Drive Connection Banner - Mobile First */}
      {!vaultStatus.is_gdrive_connected && (
        <div className={`p-4 sm:p-6 rounded-2xl border flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-500 overflow-hidden ${
          gdriveConfigured === false
            ? 'bg-amber-500/5 border-amber-500/20'
            : 'bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-transparent border-indigo-500/10'
        }`}>
          <div className="flex gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm shrink-0">
              {gdriveConfigured === false
                ? <Settings className="w-5 h-5 sm:w-8 sm:h-8 text-amber-500" />
                : <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" className="w-6 h-6 sm:w-8 sm:h-8" alt="GDrive" />}
            </div>
            <div className="min-w-0 flex-1">
              {gdriveConfigured === false ? (
                <>
                  <h2 className="text-xs sm:text-base font-bold text-amber-600 dark:text-amber-400">Google Drive Required</h2>
                  <p className="text-[10px] sm:text-xs opacity-70 mt-1 leading-relaxed">Configure API credentials in your backend <code className="bg-black/10 dark:bg-white/10 px-1 rounded">.env</code> to enable cloud sync.</p>
                  <div className="mt-2 bg-black/10 dark:bg-white/5 rounded-lg p-2 font-mono text-[9px] sm:text-[10px] overflow-x-auto no-scrollbar">
                    <p className="whitespace-nowrap"><span className="text-emerald-500">GOOGLE_CLIENT_ID</span>=...</p>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-sm sm:text-lg font-bold">Cloud Encryption</h2>
                  <p className="text-[11px] sm:text-sm opacity-70 leading-relaxed">Securely sync your vault with Google Drive. Files are encrypted before they leave your device.</p>
                </>
              )}
            </div>
          </div>
          {gdriveConfigured !== false && (
            <button
              onClick={handleConnectGDrive}
              className="btn-primary w-full py-3 text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              <ExternalLink className="w-4 h-4" /> Connect Drive
            </button>
          )}
        </div>
      )}

      {/* Header Panel - Mobile Optimized */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-sm space-y-4 min-w-0 overflow-hidden">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
                <h1 className="text-sm sm:text-xl font-bold truncate">Elite Vault</h1>
                {vaultStatus.is_gdrive_connected && <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />}
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar min-w-0">
              <span className="text-[10px] sm:text-xs opacity-50 truncate shrink-0">
                  {vaultStatus.is_gdrive_connected ? "GDrive Linked" : "Local Only"}
              </span>
              {vaultStatus.is_gdrive_connected && (
                <button onClick={handleSwitchGDrive} className="text-[9px] font-black uppercase text-indigo-500 px-1.5 py-0.5 bg-indigo-500/5 rounded shrink-0">Switch</button>
              )}
            </div>
          </div>
          <button onClick={() => { setStatus('locked'); setMasterPassword(''); setFiles([]); }} className="p-2 opacity-30 hover:opacity-100 hover:text-red-500 shrink-0 self-start">
            <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-30" />
                <input 
                    type="text" 
                    placeholder="Search..." 
                    className="w-full bg-[var(--bg)] border-none rounded-xl pl-8 sm:pl-9 pr-4 py-2 sm:py-2.5 text-[11px] sm:text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
                <button 
                  onClick={() => { setSelectionMode(!selectionMode); setSelectedFileIds(new Set()); }}
                  className={`p-2 sm:p-2.5 rounded-xl transition-all ${selectionMode ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-[var(--bg)] hover:bg-[var(--border)]'}`}
                  title="Toggle Select Mode"
                >
                  <CheckCircle2 className={`w-4 h-4 sm:w-5 sm:h-5 ${selectionMode ? 'opacity-100' : 'opacity-40'}`} />
                </button>
                <button 
                  onClick={handleBulkDownload} 
                  disabled={isExporting}
                  className="p-2 sm:p-2.5 rounded-xl bg-[var(--bg)] hover:bg-[var(--border)] transition-colors disabled:opacity-30"
                  title="Download All / Selected as ZIP"
                >
                  <Download className={`w-4 h-4 sm:w-5 sm:h-5 opacity-60 ${isExporting ? 'animate-bounce' : ''}`} />
                </button>
                <button 
                    onClick={() => setUploadModalOpen(true)}
                    className="p-2 sm:px-6 sm:py-2.5 rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 flex items-center gap-2 active:scale-95 transition-all shrink-0"
                >
                    <Plus className="w-5 h-5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline text-xs font-bold">Add Documents</span>
                </button>
            </div>
        </div>
      </div>

      {/* Floating Action Button (Mobile) - Portal ensures it's always on top */}
      {createPortal(
        <button 
            onClick={() => setUploadModalOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-indigo-500 text-white shadow-2xl shadow-indigo-500/40 flex items-center justify-center z-[9999] sm:hidden active:scale-95 transition-transform"
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
            className="flex items-center justify-between w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs font-bold transition-all focus:ring-2 focus:ring-indigo-500/20 shadow-sm hover:border-indigo-500/30"
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-indigo-500" />
              <span>{selectedCategory === 'all' ? 'All Vault' : categories.find(c => c.id === selectedCategory)?.name || 'Select Category'}</span>
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
                    className={`w-full text-left px-4 py-3 text-xs font-bold transition-colors ${selectedCategory === 'all' ? 'bg-indigo-500 text-white' : 'hover:bg-[var(--bg)]'}`}
                  >
                    All Vault
                  </button>
                  {categories.map(cat => (
                    <div 
                      key={cat.id}
                      className={`group/cat flex items-center w-full transition-colors ${selectedCategory === cat.id ? 'bg-indigo-500 text-white' : 'hover:bg-[var(--bg)]'}`}
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
                          className={`p-1.5 rounded-lg transition-colors ${selectedCategory === cat.id ? 'hover:bg-indigo-400' : 'hover:bg-red-500/10 text-red-500'}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Files Content */}
      {groupedFiles.length === 0 ? (
        <div className="card py-24 text-center space-y-4">
          <div className="w-20 h-20 bg-[var(--bg)] rounded-full flex items-center justify-center mx-auto opacity-40">
            <Upload className="w-10 h-10" />
          </div>
          <div>
            <p className="font-semibold text-lg opacity-80">No secure files found</p>
            <p className="text-sm opacity-50">Upload your sensitive documents to store them with 256-bit encryption.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedFiles.map(group => (
            <div key={group.id} className="space-y-4">
              <button 
                onClick={() => toggleCategory(group.id)}
                className="flex items-center gap-2 group w-full text-left"
              >
                <div className="p-1 rounded bg-[var(--border)] group-hover:bg-indigo-500/20 transition-colors">
                  {collapsedCategories[group.id] ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
                <h3 className="text-sm font-bold uppercase tracking-widest opacity-70 flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-indigo-500" />
                  {group.name}
                  <span className="text-[10px] font-medium bg-[var(--border)] px-1.5 py-0.5 rounded-full">{group.files.length}</span>
                </h3>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </button>

              {!collapsedCategories[group.id] && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 animate-in fade-in duration-500">
                  {group.files.map(file => {
                    const isSelected = selectedFileIds.has(file.id)
                    return (
                      <div 
                        key={file.id} 
                        onClick={() => selectionMode && toggleFileSelection(file.id)}
                        className={`group p-3 rounded-2xl bg-gradient-to-br from-[var(--card)] to-[var(--bg)]/50 border transition-all flex flex-col gap-3 min-w-0 overflow-hidden shadow-sm relative ${
                          isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-[var(--border)] hover:border-indigo-500/50'
                        } ${selectionMode ? 'cursor-pointer' : ''}`}
                      >
                        {/* Selection Checkbox */}
                        {selectionMode && (
                          <div className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-black/10 border-white/20'
                          }`}>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between min-w-0 gap-2">
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center border border-[var(--border)] shadow-sm shrink-0">
                                {getFileIcon(file.mimetype)}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-bold text-[13px] truncate" title={file.filename}>{file.filename}</p>
                                <div className="flex items-center gap-2 mt-0.5 min-w-0">
                                    <span className="text-[9px] font-black opacity-30 uppercase tracking-widest shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                                    <span className="text-[9px] font-black opacity-30 uppercase tracking-widest shrink-0">•</span>
                                    <span className="text-[9px] font-black opacity-30 uppercase tracking-widest truncate">{new Date(file.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                </div>
                            </div>
                            <button onClick={() => handleDelete(file.id)} className="p-2 text-red-500/40 hover:text-red-500 transition-colors shrink-0">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <button 
                                onClick={() => handlePreview(file)}
                                className="flex-1 py-2.5 flex items-center justify-center gap-2 text-[11px] font-bold bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                            >
                                <Eye className="w-4 h-4" /> View
                            </button>
                            <button 
                                onClick={() => handleDownload(file)}
                                className="flex-1 py-2.5 flex items-center justify-center gap-2 text-[11px] font-bold bg-[var(--bg)] hover:bg-[var(--border)] rounded-xl border border-[var(--border)] active:scale-95 transition-all"
                            >
                                <Download className="w-4 h-4" /> Save
                            </button>
                        </div>
                    </div>
                  )
                })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Security Tip */}
      <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl flex gap-3 items-center">
         <Shield className="w-5 h-5 text-amber-500 flex-shrink-0" />
         <p className="text-xs text-amber-600 dark:text-amber-400 opacity-90">
             <b>Privacy Warning:</b> Your files are encrypted locally {vaultStatus.is_gdrive_connected ? "before uploading to Google Drive" : "locally"}. If you lose your Master Password, these files cannot be recovered.
         </p>
      </div>

      <VaultUploadModal 
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSaved={fetchAll}
        categories={categories}
        masterPassword={masterPassword}
      />

      {previewData.isOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/98 backdrop-blur-xl cursor-pointer" 
                onClick={closePreview} 
            />
            
            {/* Controls Header */}
            <div className="relative w-full flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 z-50 bg-slate-900/50 backdrop-blur-md border-b border-white/10">
                <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-sm sm:text-lg truncate">{previewData.filename}</h3>
                    <p className="text-white/40 text-[9px] sm:text-[10px] uppercase tracking-widest truncate">{previewData.mimetype}</p>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-3 ml-4">
                    <button 
                        onClick={() => {
                            const a = document.createElement('a')
                            a.href = previewData.url
                            a.download = previewData.filename
                            a.click()
                        }}
                        className="p-2 sm:p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
                        title="Download"
                    >
                        <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button 
                        onClick={closePreview}
                        className="p-2 sm:p-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all shadow-lg"
                        title="Close"
                    >
                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                </div>
            </div>
            
            {/* Preview Area */}
            <div className="relative flex-1 w-full p-4 sm:p-8 flex items-center justify-center overflow-hidden">
                <div className="w-full h-full max-w-6xl bg-white/5 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">
                    {previewData.mimetype.startsWith('image/') ? (
                        <img src={previewData.url} className="w-full h-full object-contain" alt="Preview" />
                    ) : previewData.mimetype === 'application/pdf' ? (
                        <iframe src={`${previewData.url}#toolbar=0`} className="w-full h-full border-0" title="PDF Preview" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-white/60 space-y-4">
                            <FileText className="w-20 h-20 opacity-20" />
                            <p>No interactive preview available for this file type.</p>
                            <button 
                                onClick={() => {
                                    const a = document.createElement('a')
                                    a.href = previewData.url
                                    a.download = previewData.filename
                                    a.click()
                                }}
                                className="btn-primary"
                            >
                                Download to View
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
      )}
    </div>
  )
}
