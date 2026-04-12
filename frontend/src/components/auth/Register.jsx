import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff, ArrowRight, Check } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const pwStrength = (() => {
    const p = form.password
    if (!p) return 0
    let s = 0
    if (p.length >= 6) s++
    if (p.length >= 10) s++
    if (/[A-Z]/.test(p)) s++
    if (/[0-9]/.test(p)) s++
    if (/[^A-Za-z0-9]/.test(p)) s++
    return s
  })()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match')
      return
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      await register(form.name, form.email, form.password)
      toast.success('Account created!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      <div className="w-full max-w-md">

        {/* ✅ LOGO */}
        <div className="text-center mb-8">
          <img
            src="/assets/logo.png"
            className="w-16 h-16 rounded-full mx-auto mb-4"
          />
          <h1 className="text-2xl font-semibold">Budget Tracker</h1>
          <p className="opacity-60 text-sm">Start your financial journey</p>
        </div>

        {/* Perks */}
        <div className="flex justify-center gap-4 mb-6 flex-wrap text-xs opacity-60">
          {['Free forever', 'Private data', 'Secure'].map(p => (
            <div key={p} className="flex items-center gap-1">
              <Check className="w-3 h-3" />
              {p}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-lg font-semibold mb-1">Create account</h2>
          <p className="opacity-60 text-sm mb-6">Get started in seconds</p>

          <form onSubmit={handleSubmit} className="space-y-4">

            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="input"
              placeholder="Full Name"
              required
            />

            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              className="input"
              placeholder="Email"
              required
            />

            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                className="input pr-10"
                placeholder="Password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <input
              type="password"
              value={form.confirm}
              onChange={e => set('confirm', e.target.value)}
              className="input"
              placeholder="Confirm Password"
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2"
            >
              {loading
                ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <>Create account <ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>

          <p className="text-center text-sm opacity-60 mt-6">
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--primary)' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}