import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../../api/client'
import { Eye, EyeOff, ArrowRight, Check } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Register() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ name: '', email: '', password: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState('form') // 'form' or 'verify'
  const [otp, setOtp] = useState('')
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [showPw, setShowPw] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const res = await authApi.register(formData)
      toast.success(res.message)
      setRegisteredEmail(formData.email)
      setStep('verify')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const res = await authApi.verifyEmail({ 
        email: registeredEmail, 
        otp_code: otp 
      })
      toast.success('Email verified successfully!')
      localStorage.setItem('token', res.access_token)
      localStorage.setItem('user', JSON.stringify(res.user))
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Verification failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    try {
      await authApi.resendVerification(registeredEmail)
      toast.success('New code sent to your email')
    } catch (err) {
      toast.error('Failed to resend code')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      <div className="w-full max-w-md">
        {/* LOGO */}
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            className="w-16 h-16 rounded-full mx-auto mb-2"
            alt="Logo"
          />
          <h1 className="text-2xl font-semibold">Budget Tracker</h1>
          <p className="opacity-60 text-sm">Join the Elite Privacy Circle</p>
        </div>

        {/* Perks */}
        <div className="flex justify-center gap-4 mb-6 flex-wrap text-xs opacity-60">
          {['Free forever', 'End-to-End Encrypted', 'Secure'].map(p => (
            <div key={p} className="flex items-center gap-1">
              <Check className="w-3 h-3 text-green-500" />
              {p}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="card p-8">
          {step === 'form' ? (
            <>
              <h2 className="text-2xl font-semibold mb-1 text-center">Create account</h2>
              <p className="opacity-60 text-sm mb-6 text-center">Get started in seconds</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  className="input w-full"
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                
                <input
                  type="email"
                  required
                  placeholder="Email"
                  className="input w-full"
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />

                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    placeholder="Password"
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

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2"
                >
                  {isLoading 
                    ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <>Register <ArrowRight className="w-4 h-4" /></>
                  }
                </button>
              </form>

              <p className="text-center text-sm opacity-60 mt-6">
                Already have an account?{' '}
                <Link to="/login" style={{ color: 'var(--primary)' }}>
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-semibold mb-1 text-center">Verify Email</h2>
              <p className="opacity-60 text-sm mb-6 text-center">
                We've sent an OTP to <b>{registeredEmail}</b>
              </p>

              <form onSubmit={handleVerify} className="space-y-4">
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="000000"
                  className="input w-full text-center tracking-[0.5em] font-bold text-xl"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full py-3"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                </button>

                <div className="text-center mt-4">
                  <button 
                    type="button" 
                    onClick={handleResend}
                    className="text-xs text-indigo-500 hover:underline"
                  >
                    Didn't receive a code? Resend
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}