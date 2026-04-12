import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [needs2FA, setNeeds2FA] = useState(false)
  const [otpCode, setOtpCode] = useState('')

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (needs2FA) {
         await login(form.email, form.password, otpCode)
      } else {
         await login(form.email, form.password)
      }
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      if (err.response?.data?.detail === '2FA_REQUIRED') {
         setNeeds2FA(true)
         toast.success('Please enter your Authenticator code')
      } else {
         toast.error(err.response?.data?.detail || 'Invalid email or password')
      }
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
          <p className="opacity-60 text-sm">Your smart financial companion</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-lg font-semibold mb-1">Sign in</h2>
          {needs2FA ? (
            <form onSubmit={handleSubmit} className="space-y-4 mt-6">
              <div>
                <label className="label text-center block w-full mb-3">Google Authenticator Code</label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value)}
                  className="input tracking-widest text-center text-3xl font-mono py-4"
                  placeholder="000 000"
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading || otpCode.length < 6}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-4"
              >
                {loading
                  ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <>Verify & Sign in <ArrowRight className="w-4 h-4" /></>
                }
              </button>
              <button type="button" onClick={() => setNeeds2FA(false)} className="w-full text-center text-sm opacity-60 hover:opacity-100 py-2">
                Back to password
              </button>
            </form>
          ) : (
            <>
              <p className="opacity-60 text-sm mb-6">
                Welcome back! Enter your details below.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Email address</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    className="input"
                    placeholder="you@example.com"
                    required
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
                      placeholder="••••••••"
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
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2"
                >
                  {loading
                    ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <>Sign in <ArrowRight className="w-4 h-4" /></>
                  }
                </button>
              </form>
            </>
          )}

          <p className="text-center text-sm opacity-60 mt-6">
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--primary)' }}>
              Create one
            </Link>
          </p>
        </div>

        <p className="text-center text-xs opacity-50 mt-6">
          Your data is private and secure.
        </p>
      </div>
    </div>
  )
}