import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { TrendingUp, Eye, EyeOff, ArrowRight, Check } from 'lucide-react'
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

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][pwStrength]
  const strengthColor = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-400', 'bg-emerald-600'][pwStrength]

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
      toast.success('Account created! Welcome 🎉')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-brand-50 to-slate-100 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-200 rounded-full opacity-20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-200 rounded-full opacity-20 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-500 rounded-2xl shadow-lg shadow-brand-200 mb-4">
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display font-bold text-3xl text-slate-800">Budget Tracker</h1>
          <p className="text-slate-500 mt-1 text-sm">Start your financial journey today</p>
        </div>

        {/* Perks */}
        <div className="flex justify-center gap-6 mb-6 flex-wrap">
          {['Free forever', 'Private data', '23 categories included'].map(p => (
            <div key={p} className="flex items-center gap-1.5 text-xs text-slate-500">
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              {p}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 p-8">
          <h2 className="font-display font-bold text-xl text-slate-800 mb-1">Create account</h2>
          <p className="text-slate-400 text-sm mb-6">Get started — it only takes a minute.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className="input"
                placeholder="Rahul Sharma"
                required
                autoComplete="name"
              />
            </div>

            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                className="input"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  className="input pr-10"
                  placeholder="Min. 6 characters"
                  required
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i <= pwStrength ? strengthColor : 'bg-slate-200'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">{strengthLabel}</p>
                </div>
              )}
            </div>

            <div>
              <label className="label">Confirm Password</label>
              <input
                type={showPw ? 'text' : 'password'}
                value={form.confirm}
                onChange={e => set('confirm', e.target.value)}
                className={`input ${form.confirm && form.confirm !== form.password ? 'border-red-300 focus:ring-red-200' : ''}`}
                placeholder="Repeat your password"
                required
              />
              {form.confirm && form.confirm !== form.password && (
                <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || (form.confirm && form.confirm !== form.password)}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base mt-2 disabled:opacity-60"
            >
              {loading
                ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <>Create account <ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 font-semibold hover:text-brand-700 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
