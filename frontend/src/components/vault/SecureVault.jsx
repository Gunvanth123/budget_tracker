import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { 
  Shield, Lock, Unlock, Upload, Download, Trash2, 
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

  const handleDownload = async (fileInfo) => {
    toast.loading(`Decrypting ${fileInfo.filename}...`, { id: 'dec' })
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
      const a = document.createElement('a')
      a.href = url
      a.download = res.filename
      a.click()
      toast.success("Downloaded & Decrypted", { id: 'dec' })
    } catch (err) {
      toast.error("Decryption failed. Wrong key?", { id: 'dec' })
    }
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
    <div className="space-y-6">
      {/* Google Drive Connection Banner */}
      {!vaultStatus.is_gdrive_connected && (
        <div className={`border p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500 ${
          gdriveConfigured === false
            ? 'bg-amber-500/5 border-amber-500/20'
            : 'bg-gradient-to-r from-indigo-500/10 to-blue-500/10 border-indigo-500/20'
        }`}>
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-md shrink-0">
              {gdriveConfigured === false
                ? <Settings className="w-8 h-8 text-amber-500" />
                : <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" className="w-8 h-8" alt="GDrive" />}
            </div>
            <div>
              {gdriveConfigured === false ? (
                <>
                  <h2 className="text-base font-bold text-amber-600 dark:text-amber-400">Google Drive Setup Required</h2>
                  <p className="text-sm opacity-70 mt-1">The server isn't configured with Google API credentials yet. Add these to your backend <code className="bg-black/10 dark:bg-white/10 px-1 rounded text-xs font-mono">.env</code> file to enable cloud storage:</p>
                  <div className="mt-3 bg-black/5 dark:bg-white/5 rounded-lg p-3 font-mono text-xs space-y-1">
                    <p><span className="text-emerald-500">GOOGLE_CLIENT_ID</span>=your-client-id</p>
                    <p><span className="text-emerald-500">GOOGLE_CLIENT_SECRET</span>=your-client-secret</p>
                    <p><span className="text-emerald-500">GOOGLE_REDIRECT_URI</span>=http://localhost:5173/vault</p>
                  </div>
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Get credentials from Google Cloud Console
                  </a>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-bold">Upgrade to Cloud Storage</h2>
                  <p className="text-sm opacity-70">Link your Google Drive to store files in structured folders with military-grade encryption.</p>
                </>
              )}
            </div>
          </div>
          {gdriveConfigured !== false && (
            <button
              onClick={handleConnectGDrive}
              className="btn-primary px-8 py-3 flex items-center gap-2 shadow-xl shadow-indigo-500/20 hover:scale-105 transition-all shrink-0"
            >
              <ExternalLink className="w-4 h-4" /> Connect My Drive
            </button>
          )}
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
                Elite Privacy Vault
                {vaultStatus.is_gdrive_connected && <CheckCircle2 className="w-4 h-4 text-emerald-500" title="Connected to Google Drive" />}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-xs opacity-60">
                  {vaultStatus.is_gdrive_connected ? "Synced with Google Drive" : "Local database storage active"}
              </p>
              {vaultStatus.is_gdrive_connected && (
                <button 
                  onClick={handleSwitchGDrive}
                  className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 hover:text-indigo-600 transition-colors bg-indigo-500/5 px-2 py-0.5 rounded"
                >
                  Switch Account
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40 group-focus-within:opacity-100 transition-opacity" />
                <input 
                    type="text" 
                    placeholder="Search vault..." 
                    className="input pl-9 pr-4 py-2 text-sm w-full md:w-64"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>
            
            <button 
                onClick={() => setUploadModalOpen(true)}
                className="btn-primary flex items-center gap-2 px-5 py-2 whitespace-nowrap shadow-lg shadow-[var(--primary)]/20 hover:scale-105 transition-all"
            >
                <Plus className="w-4 h-4" />
                Add Documents
            </button>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar animate-in fade-in slide-in-from-left-4 duration-500">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
            selectedCategory === 'all' 
              ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-500/20' 
              : 'bg-[var(--card)] border-[var(--border)] opacity-60 hover:opacity-100 hover:border-indigo-500/50'
          }`}
        >
          All Vault
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id.toString())}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
              selectedCategory === cat.id.toString()
                ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-500/20' 
                : 'bg-[var(--card)] border-[var(--border)] opacity-60 hover:opacity-100 hover:border-indigo-500/50'
            }`}
          >
            {cat.name}
          </button>
        ))}
        {files.some(f => !f.category_id) && (
          <button
            onClick={() => setSelectedCategory('uncategorized')}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
              selectedCategory === 'uncategorized' 
                ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-500/20' 
                : 'bg-[var(--card)] border-[var(--border)] opacity-60 hover:opacity-100 hover:border-indigo-500/50'
            }`}
          >
            Uncategorized
          </button>
        )}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-500">
                  {group.files.map(file => (
                    <div key={file.id} className="group card p-4 hover:shadow-xl hover:border-[var(--primary)] transition-all relative overflow-hidden">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-[var(--bg)] flex items-center justify-center border border-[var(--border)] group-hover:scale-110 transition-transform">
                                {getFileIcon(file.mimetype)}
                            </div>
                            <div className="flex items-center gap-2">
                                {file.storage_location === 'gdrive' && (
                                     <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" className="w-4 h-4 opacity-60" alt="GDrive" title="Stored in Google Drive" />
                                )}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleDelete(file.id)} className="p-1.5 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors" title="Delete">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <p className="font-bold text-sm truncate pr-6" title={file.filename}>{file.filename}</p>
                            <div className="flex items-center justify-between text-[10px] opacity-60 uppercase font-medium">
                                <span>{(file.size / 1024).toFixed(1)} KB</span>
                                <span>{new Date(file.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                            <button 
                                onClick={() => handlePreview(file)}
                                className="flex-1 py-2 flex items-center justify-center gap-2 text-xs font-bold bg-[var(--bg)] hover:bg-indigo-500 hover:text-white rounded-lg border border-[var(--border)] transition-all"
                            >
                                <Eye className="w-3.5 h-3.5" /> View
                            </button>
                            <button 
                                onClick={() => handleDownload(file)}
                                className="flex-1 py-2 flex items-center justify-center gap-2 text-xs font-bold bg-[var(--bg)] hover:bg-emerald-500 hover:text-white rounded-lg border border-[var(--border)] transition-all"
                            >
                                <Download className="w-3.5 h-3.5" /> Download
                            </button>
                        </div>
                    </div>
                  ))}
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
            <div className="relative w-full flex items-center justify-between px-6 py-4 z-50 bg-slate-900/50 backdrop-blur-md border-b border-white/10">
                <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-lg truncate">{previewData.filename}</h3>
                    <p className="text-white/40 text-[10px] uppercase tracking-widest">{previewData.mimetype}</p>
                </div>
                
                <div className="flex items-center gap-3 ml-4">
                    <button 
                        onClick={() => {
                            const a = document.createElement('a')
                            a.href = previewData.url
                            a.download = previewData.filename
                            a.click()
                        }}
                        className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
                        title="Download"
                    >
                        <Download className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={closePreview}
                        className="p-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all shadow-lg"
                        title="Close"
                    >
                        <X className="w-5 h-5" />
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
