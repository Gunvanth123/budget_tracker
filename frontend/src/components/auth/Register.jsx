import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff, ArrowRight, User, Mail, Lock, CheckCircle2, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ name: '', email: '', password: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await register(formData.name, formData.email, formData.password)
      toast.success('Account created successfully!')
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#090d16]" style={{ color: 'var(--text)' }}>
      {/* Background Decorative Ambient Glowing Blobs */}
      <div className="absolute top-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[350px] h-[350px] rounded-full bg-primary/15 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-[160px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        {/* LOGO */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 100 }}
          className="text-center mb-6"
        >
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 mx-auto mb-4 border border-white/10">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text)]">Budget Tracker</h1>
          <p className="text-xs text-[var(--text-muted)] font-medium mt-1">Join the Elite Privacy Circle</p>
        </motion.div>

        {/* Perks */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center gap-3 mb-6 flex-wrap"
        >
          {['Free forever', 'End-to-End Encrypted', 'Secure'].map(p => (
            <div key={p} className="flex items-center gap-1.5 px-3 py-1 bg-white/5 dark:bg-white/5 border border-white/5 dark:border-white/5 rounded-full text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] backdrop-blur-md">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
              {p}
            </div>
          ))}
        </motion.div>

        {/* Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="card w-full p-8 relative overflow-hidden bg-white/40 dark:bg-[#0f1628]/45 border border-white/20 dark:border-white/10 shadow-2xl rounded-3xl backdrop-blur-2xl"
        >
          <div className="text-center space-y-1 mb-6">
            <h2 className="text-xl font-extrabold text-[var(--text)] tracking-tight">Create account</h2>
            <p className="text-xs text-[var(--text-muted)] font-medium">Get started in seconds</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] opacity-50" />
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  className="input pl-10"
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] opacity-50" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  className="input pl-10"
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] opacity-50" />
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  className="input pl-10 pr-10 font-mono tracking-wide"
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
              className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 mt-2 bg-gradient-to-r from-indigo-500 to-indigo-600 border-none shadow-lg shadow-indigo-500/20 text-xs uppercase tracking-wider font-bold"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Register <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 mt-6 border-t border-black/5 dark:border-white/5 text-center text-xs text-[var(--text-muted)] font-medium">
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--primary)' }} className="font-bold hover:underline text-indigo-500">
              Sign in
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}