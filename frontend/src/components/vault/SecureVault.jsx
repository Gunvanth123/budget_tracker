import { useState, useEffect, useCallback } from 'react'
import { 
  Shield, Lock, Unlock, Upload, Download, Trash2, 
  File, FileText, FileImage, MoreVertical, 
  Loader2, Plus, Search, Filter
} from 'lucide-react'
import { vaultApi, passwordsApi } from '../../api/client'
import toast from 'react-hot-toast'
import CryptoJS from 'crypto-js'

export default function SecureVault() {
  const [status, setStatus] = useState('loading') // loading, locked, unlocked
  const [masterPassword, setMasterPassword] = useState('')
  const [files, setFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const checkVaultStatus = useCallback(async () => {
    try {
      const res = await passwordsApi.status()
      if (!res.is_setup) {
        // Vault follows the same master password setup as password manager
        setStatus('locked')
      } else {
        setStatus('locked')
      }
    } catch (e) {
      toast.error("Security system unreachable")
    }
  }, [])

  useEffect(() => {
    checkVaultStatus()
  }, [checkVaultStatus])

  const fetchFiles = async () => {
    try {
      const data = await vaultApi.getAll()
      setFiles(data)
    } catch {
      toast.error("Failed to load your vault")
    }
  }

  const handleUnlock = async (e) => {
    e.preventDefault()
    try {
      await passwordsApi.verify(masterPassword)
      setStatus('unlocked')
      fetchFiles()
      toast.success("Vault decrypted successfully")
    } catch {
      toast.error("Incorrect Master Password")
      setMasterPassword('')
    }
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return toast.error("Files must be under 5MB")

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
      
      // Convert WordArray to Uint8Array/Blob
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

  const handleDelete = async (id) => {
    if (!confirm("Permanently delete this file from the secure vault?")) return
    try {
      await vaultApi.delete(id)
      toast.success("File deleted")
      fetchFiles()
    } catch {
      toast.error("Delete failed")
    }
  }

  const getFileIcon = (mimetype) => {
    if (mimetype.startsWith('image/')) return <FileImage className="w-5 h-5 text-pink-500" />
    if (mimetype.includes('pdf') || mimetype.includes('text')) return <FileText className="w-5 h-5 text-blue-500" />
    return <File className="w-5 h-5 text-slate-400" />
  }

  const filteredFiles = files.filter(f => 
    f.filename.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (status === 'loading') {
    return <div className="p-12 text-center opacity-50 flex items-center justify-center gap-2"><Loader2 className="animate-spin w-5 h-5"/> Initiating security protocols...</div>
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
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Elite Privacy Vault</h1>
            <p className="text-xs opacity-60">Military-grade AES-256 Encryption active</p>
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
            
            <label className="btn-primary flex items-center gap-2 px-5 py-2 whitespace-nowrap cursor-pointer shadow-lg shadow-[var(--primary)]/20 hover:scale-105 transition-all">
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Add Document
                <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} />
            </label>
        </div>
      </div>

      {/* Files Grid */}
      {filteredFiles.length === 0 ? (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFiles.map(file => (
            <div key={file.id} className="group card p-4 hover:shadow-xl hover:border-[var(--primary)] transition-all relative overflow-hidden">
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[var(--bg)] flex items-center justify-center border border-[var(--border)] group-hover:scale-110 transition-transform">
                        {getFileIcon(file.mimetype)}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleDelete(file.id)} className="p-1.5 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="space-y-1">
                    <p className="font-bold text-sm truncate pr-6" title={file.filename}>{file.filename}</p>
                    <div className="flex items-center justify-between text-[10px] opacity-60 uppercase font-medium">
                        <span>{(file.size / 1024).toFixed(1)} KB</span>
                        <span>{new Date(file.created_at).toLocaleDateString()}</span>
                    </div>
                </div>

                <button 
                    onClick={() => handleDownload(file)}
                    className="mt-4 w-full py-2 flex items-center justify-center gap-2 text-xs font-bold bg-[var(--bg)] hover:bg-[var(--primary)] hover:text-white rounded-lg border border-[var(--border)] transition-all"
                >
                    <Download className="w-3.5 h-3.5" /> Decrypt & Download
                </button>
            </div>
          ))}
        </div>
      )}

      {/* Security Tip */}
      <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl flex gap-3 items-center">
         <Shield className="w-5 h-5 text-amber-500 flex-shrink-0" />
         <p className="text-xs text-amber-600 dark:text-amber-400 opacity-90">
             <b>Privacy Warning:</b> Your files are encrypted locally. If you lose your Master Password, these files cannot be recovered. We do not store your password on our servers.
         </p>
      </div>
    </div>
  )
}
