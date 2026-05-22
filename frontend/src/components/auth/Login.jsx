import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff, ArrowRight, Mail, Lock, ShieldCheck, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: '', password: '', otp_code: '' })
  const [showPw, setShowPw] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [needs2FA, setNeeds2FA] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await login(formData.email, formData.password, formData.otp_code)
      toast.success('Sign in successful!')
      navigate('/')
    } catch (err) {
      if (err.message === '2FA_REQUIRED' || err.response?.data?.detail === '2FA_REQUIRED') {
        setNeeds2FA(true)
        toast.success('Authenticator code required')
      } else {
        toast.error(err.response?.data?.detail || err.message || 'Sign in failed')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#090d16]" style={{ color: 'var(--text)' }}>
      {/* Background Decorative Ambient Glowing Blobs */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-primary/15 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-[160px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        
        {/* LOGO */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 100 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 mx-auto mb-4 border border-white/10">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text)]">Budget Tracker</h1>
          <p className="text-xs text-[var(--text-muted)] font-medium mt-1">Your smart, encrypted financial companion</p>
        </motion.div>

        {/* Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="card w-full p-8 relative overflow-hidden bg-white/40 dark:bg-[#0f1628]/45 border border-white/20 dark:border-white/10 shadow-2xl rounded-3xl backdrop-blur-2xl"
        >
          <AnimatePresence mode="wait">
            {needs2FA ? (
              <motion.div 
                key="needs2FA"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="text-center space-y-1.5">
                  <h2 className="text-xl font-extrabold text-[var(--text)] tracking-tight">Two-Factor Authentication</h2>
                  <p className="text-xs text-[var(--text-muted)] font-medium">Please enter your Google Authenticator code.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] opacity-50" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="000000"
                      className="input pl-11 text-center tracking-[0.5em] font-mono font-bold text-lg bg-white/50 dark:bg-black/20"
                      onChange={(e) => setFormData({ ...formData, otp_code: e.target.value })}
                    />
                  </div>
                  
                  <button 
                    disabled={isLoading} 
                    className="btn-primary w-full py-3.5 bg-gradient-to-r from-indigo-500 to-indigo-600 border-none shadow-lg shadow-indigo-500/20 text-xs uppercase tracking-wider font-bold"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Verifying...
                      </>
                    ) : (
                      'Verify & Sign In'
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setNeeds2FA(false)}
                    className="text-[10px] font-bold text-center block mx-auto text-[var(--text-muted)] hover:text-[var(--text)] uppercase tracking-wider transition-colors"
                  >
                    Back to login
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div 
                key="loginForm"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-extrabold text-[var(--text)] tracking-tight">Welcome back</h2>
                  <p className="text-xs text-[var(--text-muted)] font-medium">Please enter your login details</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] opacity-50" />
                      <input
                        type="email"
                        required
                        placeholder="name@company.com"
                        className="input pl-10"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Password</label>
                      <Link to="/forgot-password" style={{ color: 'var(--primary)' }} className="text-[10px] font-bold hover:underline uppercase tracking-wider">
                        Forgot?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] opacity-50" />
                      <input
                        type={showPw ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        className="input pl-10 pr-10 font-mono tracking-wide"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] opacity-60 hover:opacity-100 transition-opacity"
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary w-full py-3.5 mt-2 bg-gradient-to-r from-indigo-500 to-indigo-600 border-none shadow-lg shadow-indigo-500/20 text-xs uppercase tracking-wider font-bold"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Signing in...
                      </>
                    ) : (
                      'Sign in'
                    )}
                  </button>
                </form>

                <div className="pt-2 border-t border-black/5 dark:border-white/5 text-center text-xs text-[var(--text-muted)] font-medium">
                  Don't have an account?{' '}
                  <Link to="/register" style={{ color: 'var(--primary)' }} className="font-bold hover:underline text-indigo-500">
                    Sign up
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 0.3 }}
          className="text-center text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)] mt-6"
        >
          All data is end-to-end encrypted locally.
        </motion.p>
      </div>
    </div>
  )
}