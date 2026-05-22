import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Upload, Plus, FolderPlus, Loader2, FileCheck, Edit3 } from 'lucide-react'
import toast from 'react-hot-toast'
import CryptoJS from 'crypto-js'
import { vaultApi } from '../../api/client'
import { motion, AnimatePresence } from 'framer-motion'

export default function VaultUploadModal({ isOpen, onClose, onSaved, categories, masterPassword }) {
  const [selectedFiles, setSelectedFiles] = useState([]) // Array of { file, customName }
  const [categoryId, setCategoryId] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isDragOver, setIsDragOver] = useState(false)

  if (!isOpen) return null

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    const newFiles = files.map(f => ({
      file: f,
      customName: f.name.substring(0, f.name.lastIndexOf('.')) || f.name
    }))
    setSelectedFiles(newFiles)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    const newFiles = files.map(f => ({
      file: f,
      customName: f.name.substring(0, f.name.lastIndexOf('.')) || f.name
    }))
    setSelectedFiles(newFiles)
  }

  const updateFileName = (index, newName) => {
    const updated = [...selectedFiles]
    updated[index].customName = newName
    setSelectedFiles(updated)
  }

  const encryptAndUpload = async (item) => {
    const { file, customName } = item
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target.result
          const wa = CryptoJS.lib.WordArray.create(arrayBuffer)
          const encrypted = CryptoJS.AES.encrypt(wa, masterPassword).toString()

          // Keep original extension
          const ext = file.name.substring(file.name.lastIndexOf('.'))
          const finalName = customName.endsWith(ext) ? customName : customName + ext

          const formData = new FormData()
          formData.append('filename', finalName)
          formData.append('mimetype', file.type)
          formData.append('size', file.size)
          formData.append('encrypted_content', encrypted)
          
          if (categoryId === 'new' && newCategoryName) {
            formData.append('category_name', newCategoryName)
          } else if (categoryId && categoryId !== 'new') {
            formData.append('category_id', categoryId)
          }

          await vaultApi.upload(formData)
          resolve()
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = () => reject(new Error("File read failed"))
      reader.readAsArrayBuffer(file)
    })
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (selectedFiles.length === 0) return toast.error("Please select files")
    if (categoryId === 'new' && !newCategoryName) return toast.error("Enter category name")
    
    // Validate custom names
    if (selectedFiles.some(f => !f.customName.trim())) {
      return toast.error("Please provide names for all files")
    }

    setUploading(true)
    setProgress(0)

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        await encryptAndUpload(selectedFiles[i])
        setProgress(Math.round(((i + 1) / selectedFiles.length) * 100))
      }
      toast.success("All files uploaded securely!")
      onSaved()
      onClose()
      setSelectedFiles([])
      setCategoryId('')
      setNewCategoryName('')
    } catch (err) {
      toast.error("Upload failed")
    } finally {
      setUploading(false)
    }
  }

  return createPortal(
    <AnimatePresence>
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
          className="modal-content w-full max-w-xl max-h-[90vh] overflow-y-auto relative z-10 flex flex-col bg-white/70 dark:bg-[#0f1628]/70 border border-white/20 dark:border-white/10 shadow-2xl rounded-3xl"
        >
          {/* Ambient glows inside modal */}
          <div className="absolute top-0 left-10 w-32 h-32 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-10 w-32 h-32 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-black/5 dark:border-white/5 sticky top-0 bg-transparent backdrop-blur-md z-10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
                <Upload className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-[var(--text)] tracking-tight">
                  Secure Document Upload
                </h2>
                <p className="text-[10px] text-[var(--text-muted)] font-medium mt-0.5">Files are encrypted locally on your device via AES-256</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 text-[var(--text-muted)] opacity-70 hover:opacity-100 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Step 1: Select Files (Drag & Drop Zone) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Step 1: Select Files</label>
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center gap-4 text-center cursor-pointer ${
                  selectedFiles.length > 0 
                    ? 'border-emerald-500/50 bg-emerald-500/5' 
                    : isDragOver
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-[var(--border)] hover:border-indigo-500/50 bg-black/5 dark:bg-black/20'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                  selectedFiles.length > 0 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                    : 'bg-indigo-500/10 text-indigo-500'
                }`}>
                  {selectedFiles.length > 0 ? <FileCheck className="w-6 h-6" /> : <Upload className="w-6 h-6 animate-pulse" />}
                </div>
                <div>
                  <p className="font-bold text-sm text-[var(--text)]">
                    {selectedFiles.length > 0 ? `${selectedFiles.length} files selected` : "Drag & drop or click to upload"}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">PDF, JPG, PNG, DOC (Encrypted Storage)</p>
                </div>
                <input 
                  type="file" 
                  multiple 
                  onChange={handleFileChange} 
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  disabled={uploading}
                />
              </div>
            </div>

            {/* Step 2: Naming Section */}
            {selectedFiles.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2 overflow-hidden"
              >
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Step 2: Name Your Documents</label>
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {selectedFiles.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-black/5 dark:bg-black/25 rounded-2xl border border-black/5 dark:border-white/5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                        <FileCheck className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] text-[var(--text-muted)] truncate mb-1">Original: {item.file.name}</p>
                        <div className="relative">
                          <Edit3 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] opacity-50" />
                          <input 
                            type="text"
                            className="input-sm w-full pl-8 py-1.5 text-xs bg-white/50 dark:bg-black/20"
                            placeholder="Enter document name..."
                            value={item.customName}
                            onChange={(e) => updateFileName(i, e.target.value)}
                            disabled={uploading}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 3: Category Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Step 3: Assign Category</label>
              <div className="flex flex-col gap-3">
                <select
                  className="select"
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  disabled={uploading}
                >
                  <option value="">No Category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                  <option value="new">+ Add New Category</option>
                </select>

                {categoryId === 'new' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="relative flex-1 overflow-hidden"
                  >
                    <FolderPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                    <input
                      type="text"
                      className="input pl-9"
                      placeholder="e.g. Identity Docs, PAN Cards..."
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      autoFocus
                    />
                  </motion.div>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {uploading && (
              <div className="space-y-2 pt-2 shrink-0">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-indigo-500 animate-pulse">Encrypting & Uploading...</span>
                  <span className="text-[var(--text)]">{progress}%</span>
                </div>
                <div className="h-2 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="p-5 border-t border-black/5 dark:border-white/5 bg-transparent backdrop-blur-md z-10 flex flex-col sm:flex-row gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={uploading}
              className="btn-secondary order-2 sm:order-1 py-3 flex-1 flex items-center justify-center text-xs uppercase tracking-wider disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={uploading || selectedFiles.length === 0}
              className="btn-primary order-1 sm:order-2 py-3 flex-1 flex items-center justify-center gap-2 text-xs uppercase tracking-wider bg-gradient-to-r from-indigo-500 to-indigo-600 border-none shadow-lg shadow-indigo-500/20 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Encrypting...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Encrypt & Store {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  )
}
