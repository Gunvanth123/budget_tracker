import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/client'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: '', password: '', otp_code: '' })
  const [showPw, setShowPw] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [needs2FA, setNeeds2FA] = useState(false)
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const res = await api.post('/auth/login', formData)
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      toast.success('Sign in successful!')
      navigate('/')
    } catch (err) {
      if (err.response?.data?.detail === '2FA_REQUIRED') {
        setNeeds2FA(true)
        toast.success('Security code required')
      } else if (err.response?.data?.detail === 'EMAIL_NOT_VERIFIED') {
        toast.error('Please verify your email first')
        setIsVerifyingEmail(true)
      } else {
        toast.error(err.response?.data?.detail || 'Sign in failed')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifySignUp = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const res = await api.post('/auth/verify-email', { 
        email: formData.email, 
        otp_code: formData.otp_code 
      })
      toast.success('Verified! Signed in.')
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      navigate('/')
    } catch (err) {
      toast.error('Invalid code')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      <div className="w-full max-w-md">

        {/* ✅ LOGO */}
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            className="w-16 h-16 rounded-full mx-auto mb-4"
          />
          <h1 className="text-2xl font-semibold">Budget Tracker</h1>
          <p className="opacity-60 text-sm">Your smart financial companion</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-2xl font-semibold mb-1 text-center">Sign in</h2>
          {isVerifyingEmail ? (
            <form onSubmit={handleVerifySignUp} className="space-y-4 mt-6">
              <p className="text-sm opacity-60 text-center">Enter the code sent to your email.</p>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="000000"
                className="input w-full text-center tracking-[0.5em] font-bold text-lg"
                onChange={(e) => setFormData({ ...formData, otp_code: e.target.value })}
              />
              <button disabled={isLoading} className="btn-primary w-full py-2.5">
                {isLoading ? 'Verifying...' : 'Verify & Sign In'}
              </button>
            </form>
          ) : needs2FA ? (
            <form onSubmit={handleSubmit} className="space-y-4 mt-6">
              <p className="text-sm opacity-60 text-center">Security code required.</p>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="OTP Code"
                className="input w-full text-center tracking-[0.5em] font-bold text-lg"
                onChange={(e) => setFormData({ ...formData, otp_code: e.target.value })}
              />
              <button disabled={isLoading} className="btn-primary w-full py-2.5">
                {isLoading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </form>
          ) : (
            <>
              <p className="opacity-60 text-sm mb-6 text-center">
                Welcome back! Enter your details below.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Email address</label>
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    className="input w-full"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-sm font-medium block">Password</label>
                    <Link to="/forgot-password" style={{ color: 'var(--primary)' }} className="text-xs hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      className="input w-full pr-10"
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full py-2.5 mt-2"
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
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