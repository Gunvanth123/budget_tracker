import { useState } from 'react'
import { passwordsApi, vaultApi } from '../../api/client'
import toast from 'react-hot-toast'
import CryptoJS from 'crypto-js'
import { Key, Lock, ShieldAlert, Loader2, CheckCircle2, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function MasterKeyChange() {
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('form') // form, verifying, reencrypting, complete
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [formData, setFormData] = useState({
    oldKey: '',
    newKey: '',
    confirmKey: ''
  })

  const handleChange = async (e) => {
    e.preventDefault()
    
    if (formData.newKey !== formData.confirmKey) {
      return toast.error('New keys do not match')
    }
    if (formData.newKey.length < 4) {
      return toast.error('New key must be at least 4 characters')
    }

    setLoading(true)
    setStep('verifying')

    try {
      // 1. Verify Old Key
      await passwordsApi.verify(formData.oldKey)
      
      // 2. Fetch all data for re-encryption
      setStep('reencrypting')
      const passwords = await passwordsApi.getAll()
      
      const reencrypted_passwords = []
      const reencrypted_files = []
      
      const total = passwords.length // For simplicity, just count passwords for progress
      setProgress({ current: 0, total })

      // Re-encrypt Passwords
      for (let i = 0; i < passwords.length; i++) {
        const p = passwords[i]
        try {
          const bytes = CryptoJS.AES.decrypt(p.encrypted_password, formData.oldKey)
          const originalPassword = bytes.toString(CryptoJS.enc.Utf8)
          
          let originalBackup = null
          if (p.backup_codes) {
            const bBytes = CryptoJS.AES.decrypt(p.backup_codes, formData.oldKey)
            originalBackup = bBytes.toString(CryptoJS.enc.Utf8)
          }

          reencrypted_passwords.push({
            id: p.id,
            encrypted_password: CryptoJS.AES.encrypt(originalPassword, formData.newKey).toString(),
            backup_codes: originalBackup ? CryptoJS.AES.encrypt(originalBackup, formData.newKey).toString() : null
          })
          
          setProgress(prev => ({ ...prev, current: i + 1 }))
        } catch (err) {
          throw new Error(`Failed to decrypt password entry: ${p.website}`)
        }
      }

      // 3. Send to Backend
      await passwordsApi.changeMasterKey({
        current_master_password: formData.oldKey,
        new_master_password: formData.newKey,
        reencrypted_passwords,
        reencrypted_files
      })

      setStep('complete')
      toast.success('Master Key updated successfully!')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Failed to change master key')
      setStep('form')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative overflow-hidden card p-6 sm:p-8 bg-white/40 dark:bg-[#0f1628]/45 border border-white/20 dark:border-white/10 shadow-2xl rounded-3xl">
      {/* Ambient glows inside card */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

      <AnimatePresence mode="wait">
        {step === 'complete' && (
          <motion.div 
            key="complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="text-center space-y-5 py-6"
          >
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-[var(--text)] tracking-tight">Success!</h3>
              <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
                Your Master Key has been changed and all vault credentials have been re-encrypted with the new key.
              </p>
            </div>
            <button 
              onClick={() => {
                setFormData({ oldKey: '', newKey: '', confirmKey: '' })
                setStep('form')
              }} 
              className="btn-primary px-8"
            >
              Go Back
            </button>
          </motion.div>
        )}

        {(step === 'verifying' || step === 'reencrypting') && (
          <motion.div 
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="text-center space-y-6 py-8"
          >
            <div className="w-16 h-16 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner relative">
              <Loader2 className="w-10 h-10 animate-spin" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[var(--text)] tracking-tight">
                {step === 'verifying' ? 'Verifying Current Key...' : 'Re-encrypting Vault Data...'}
              </h3>
              <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto leading-relaxed">
                Please do not close or reload this page. We are securely updating your encryption keys.
              </p>
            </div>
            {step === 'reencrypting' && (
              <div className="space-y-2 max-w-sm mx-auto">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  <span>Re-encrypting</span>
                  <span>{progress.current} / {progress.total}</span>
                </div>
                <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}

        {step === 'form' && (
          <motion.div 
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/5 pb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-[var(--text)] tracking-tight">Change Master Key</h3>
                <p className="text-[10px] text-[var(--text-muted)] font-medium">This key protects your passwords and secure vault items.</p>
              </div>
            </div>

            <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/15 p-4 rounded-2xl text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed font-medium">
              <strong>Crucial Notice:</strong> Changing your Master Key requires decrypting and re-encrypting all credentials. 
              This process occurs fully client-side in your browser. Be sure to note down your new key; it cannot be recovered or reset.
            </div>

            <form onSubmit={handleChange} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Current Master Key</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] opacity-50" />
                  <input 
                    type="password" 
                    className="input pl-10" 
                    placeholder="••••••••"
                    value={formData.oldKey}
                    onChange={e => setFormData({...formData, oldKey: e.target.value})}
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">New Master Key</label>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] opacity-50" />
                    <input 
                      type="password" 
                      className="input pl-10" 
                      placeholder="Min 4 characters"
                      value={formData.newKey}
                      onChange={e => setFormData({...formData, newKey: e.target.value})}
                      required 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Confirm New Key</label>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] opacity-50" />
                    <input 
                      type="password" 
                      className="input pl-10" 
                      placeholder="Confirm new key"
                      value={formData.confirmKey}
                      onChange={e => setFormData({...formData, confirmKey: e.target.value})}
                      required 
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="btn-primary w-full py-3.5 mt-4 bg-gradient-to-r from-amber-500 to-amber-600 border-none shadow-lg shadow-amber-500/20 text-xs uppercase tracking-wider font-bold"
              >
                Update Master Key & Re-encrypt
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
