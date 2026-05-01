import { useState } from 'react'
import { X, Upload, Plus, FolderPlus, Loader2, FileCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import CryptoJS from 'crypto-js'
import { vaultApi } from '../../api/client'

export default function VaultUploadModal({ isOpen, onClose, onSaved, categories, masterPassword }) {
  const [selectedFiles, setSelectedFiles] = useState([])
  const [categoryId, setCategoryId] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  if (!isOpen) return null

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 5) return toast.error("Max 5 files at once")
    setSelectedFiles(files)
  }

  const encryptAndUpload = async (file) => {
    return new Promise((resolve, reject) => {
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
    e.preventDefault()
    if (selectedFiles.length === 0) return toast.error("Please select files")
    if (categoryId === 'new' && !newCategoryName) return toast.error("Enter category name")

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[var(--card)] w-full max-w-lg rounded-3xl border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-indigo-500/5">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-500" />
              Secure Upload
            </h2>
            <p className="text-xs opacity-50 mt-1">Files are encrypted locally before transit</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-500/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* File Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider opacity-60">Select Files (Max 5)</label>
            <div className={`border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center gap-4 text-center ${
              selectedFiles.length > 0 ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-[var(--border)] hover:border-indigo-500/50 bg-[var(--bg)]'
            }`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                selectedFiles.length > 0 ? 'bg-emerald-500 text-white' : 'bg-indigo-500/10 text-indigo-500'
              }`}>
                {selectedFiles.length > 0 ? <FileCheck className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
              </div>
              <div>
                <p className="font-bold text-sm">
                  {selectedFiles.length > 0 ? `${selectedFiles.length} files selected` : "Drag & drop or click to upload"}
                </p>
                <p className="text-[10px] opacity-50 mt-1">PDF, JPG, PNG, DOC (Max 5MB each)</p>
              </div>
              <input 
                type="file" 
                multiple 
                onChange={handleFileChange} 
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={uploading}
              />
            </div>
            {selectedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-1">
                {selectedFiles.map((f, i) => (
                  <span key={i} className="text-[10px] px-2 py-1 bg-slate-500/10 rounded-md truncate max-w-[120px]">
                    {f.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Category Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider opacity-60">Assign Category</label>
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
                <div className="flex items-center gap-2 animate-in slide-in-from-top-2 duration-300">
                  <div className="relative flex-1">
                    <FolderPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                    <input
                      type="text"
                      className="input pl-9"
                      placeholder="e.g. Identity Docs, PAN Cards..."
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase">
                <span className="text-indigo-500">Encrypting & Uploading...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-[var(--border)] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || selectedFiles.length === 0}
            className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Encrypt & Store {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
