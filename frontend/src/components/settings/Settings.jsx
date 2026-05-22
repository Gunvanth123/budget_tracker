import { useState, useEffect } from 'react'
import { usersApi, mfaApi } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import QRCode from 'react-qr-code'
import toast from 'react-hot-toast'
import { User, Shield, Camera, CheckCircle2, Key, Mail, Lock, ShieldCheck, Smartphone, Eye, EyeOff } from 'lucide-react'
import ImageCropper from './ImageCropper'
import MasterKeyChange from './MasterKeyChange'
import { motion, AnimatePresence } from 'framer-motion'

export default function Settings() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)

  // Profile data
  const [profile, setProfile] = useState({ name: '', email: '', profile_picture: '', totp_enabled: false })
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '' })
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  
  // 2FA state
  const [mfaData, setMfaData] = useState(null)
  const [otpCode, setOtpCode] = useState('')

  // Crop state
  const [tempImage, setTempImage] = useState(null)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const data = await usersApi.getMe()
      setProfile(data)
    } catch {
      toast.error('Failed to load profile')
    }
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await usersApi.updateProfile({ name: profile.name, profile_picture: profile.profile_picture })
      toast.success('Profile updated!')
      if (res.profile_picture) {
        setProfile(prev => ({ ...prev, profile_picture: res.profile_picture }))
      }
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const pw = prompt('Please enter your current password to change your email:')
      if (!pw) {
          setLoading(false)
          return
      }
      await usersApi.updateEmail({ new_email: profile.email, password: pw })
      toast.success('Email successfully updated!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update email')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await usersApi.updatePassword(passwordForm)
      toast.success('Password updated securely!')
      setPasswordForm({ current_password: '', new_password: '' })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Password update failed')
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) return toast.error("File is too large (max 2MB)")
      const reader = new FileReader()
      reader.onloadend = () => {
        setTempImage(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCroppedImage = (croppedBase64) => {
    setProfile({ ...profile, profile_picture: croppedBase64 })
    setTempImage(null)
  }

  const generate2FA = async () => {
    try {
      const data = await mfaApi.generate()
      setMfaData(data)
    } catch {
      toast.error('Failed to generate 2FA')
    }
  }

  const verify2FA = async () => {
    try {
      const res = await mfaApi.verify(otpCode)
      toast.success('Google Authenticator Enabled!')
      setMfaData(null)
      if (res.user) setProfile(p => ({ ...p, ...res.user }))
      else loadProfile()
    } catch {
      toast.error('Invalid code. Try again.')
    }
  }

  const disable2FA = async () => {
    const code = prompt('Enter your current Authenticator code to disable 2FA:')
    if (!code) return
    try {
      const res = await mfaApi.disable(code)
      toast.success('2FA Disabled')
      if (res.user) setProfile(p => ({ ...p, ...res.user }))
      else loadProfile()
    } catch {
      toast.error('Invalid code. Access Denied.')
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text)]">Settings</h1>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] font-medium">Manage your security settings, profile details, and cryptography vault keys.</p>
      </div>
      
      {/* Tab Navigation - Pill style */}
      <div className="flex p-1 bg-black/5 dark:bg-white/5 rounded-2xl max-w-md border border-black/5 dark:border-white/5 backdrop-blur-md">
        <button 
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${activeTab === 'profile' ? 'bg-white dark:bg-[#1e293b] text-[var(--primary)] shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
          onClick={() => setActiveTab('profile')}
        >
          <User className="w-4 h-4" /> Profile
        </button>
        <button 
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${activeTab === 'security' ? 'bg-white dark:bg-[#1e293b] text-[var(--primary)] shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
          onClick={() => setActiveTab('security')}
        >
          <Shield className="w-4 h-4" /> Security & 2FA
        </button>
        <button 
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${activeTab === 'master-key' ? 'bg-white dark:bg-[#1e293b] text-[var(--primary)] shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
          onClick={() => setActiveTab('master-key')}
        >
          <Key className="w-4 h-4" /> Master Key
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'profile' && (
          <motion.div 
            key="profile"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* Avatar & Name Info */}
            <div className="card p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden bg-white/40 dark:bg-[#0f1628]/45">
              <div className="absolute top-0 left-0 w-32 h-32 rounded-full bg-indigo-500/5 blur-2xl pointer-events-none" />
              <div>
                <h3 className="font-extrabold text-base border-b border-black/5 dark:border-white/5 pb-3 mb-5 text-[var(--text)] tracking-tight">Public Profile</h3>
                
                <div className="flex flex-col sm:flex-row items-center gap-5 mb-6">
                  <div className="relative w-24 h-24 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center overflow-hidden border-2 border-indigo-500/50 shadow-lg group">
                    {profile.profile_picture ? (
                      <img src={profile.profile_picture} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-[var(--text-muted)] opacity-40" />
                    )}
                    <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera className="w-6 h-6 text-white" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    </label>
                  </div>
                  <div className="text-center sm:text-left space-y-1">
                    <p className="text-xs text-[var(--text-muted)] font-medium">Click on the image to upload a new profile picture. Max size: 2MB.</p>
                  </div>
                </div>

                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Public Display Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] opacity-50" />
                      <input 
                        type="text" 
                        className="input pl-10" 
                        value={profile.name} 
                        onChange={e => setProfile({...profile, name: e.target.value})} 
                        required 
                      />
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    disabled={loading} 
                    className="btn-primary w-full py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 border-none shadow-lg shadow-indigo-500/20 text-xs uppercase tracking-wider font-bold"
                  >
                    Save Changes
                  </button>
                </form>
              </div>
            </div>

            {/* Email update card */}
            <div className="card p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden bg-white/40 dark:bg-[#0f1628]/45">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
              <div>
                <h3 className="font-extrabold text-base border-b border-black/5 dark:border-white/5 pb-3 mb-5 text-[var(--text)] tracking-tight">Email Address</h3>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed font-medium mb-6">
                  Important Security Policy: You will be prompted for your account password to verify the ownership of your email address change.
                </p>

                <form onSubmit={handleEmailUpdate} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Primary Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] opacity-50" />
                      <input 
                        type="email" 
                        className="input pl-10" 
                        value={profile.email} 
                        onChange={e => setProfile({...profile, email: e.target.value})} 
                        required 
                      />
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    disabled={loading} 
                    className="btn-primary w-full py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 border-none shadow-lg shadow-indigo-500/20 text-xs uppercase tracking-wider font-bold"
                  >
                    Update Email Address
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'security' && (
          <motion.div 
            key="security"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* Change Password Card */}
            <div className="card p-6 sm:p-8 relative overflow-hidden bg-white/40 dark:bg-[#0f1628]/45">
              <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full bg-indigo-500/5 blur-2xl pointer-events-none" />
              <h3 className="font-extrabold text-base border-b border-black/5 dark:border-white/5 pb-3 mb-5 text-[var(--text)] tracking-tight">Change Password</h3>
              
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Current Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] opacity-50" />
                    <input 
                      type={showCurrentPw ? 'text' : 'password'}
                      required 
                      className="input pl-10 pr-10" 
                      value={passwordForm.current_password} 
                      onChange={e => setPasswordForm({...passwordForm, current_password: e.target.value})} 
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] opacity-60 hover:opacity-100 transition-opacity"
                    >
                      {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">New Password (min 6 chars)</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] opacity-50" />
                    <input 
                      type={showNewPw ? 'text' : 'password'}
                      required 
                      className="input pl-10 pr-10" 
                      minLength={6} 
                      value={passwordForm.new_password} 
                      onChange={e => setPasswordForm({...passwordForm, new_password: e.target.value})} 
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] opacity-60 hover:opacity-100 transition-opacity"
                    >
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading} 
                  className="btn-primary w-full py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 border-none shadow-lg shadow-indigo-500/20 text-xs uppercase tracking-wider font-bold"
                >
                  Change Password
                </button>
              </form>
            </div>

            {/* 2FA Card */}
            <div className="card p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden bg-white/40 dark:bg-[#0f1628]/45">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-indigo-500/5 blur-2xl pointer-events-none" />
              <div>
                <h3 className="font-extrabold text-base border-b border-black/5 dark:border-white/5 pb-3 mb-5 text-[var(--text)] tracking-tight">Two-Factor Authentication</h3>
                
                <div className="space-y-4">
                  {profile.totp_enabled ? (
                    <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/15 p-5 rounded-2xl text-center space-y-4">
                      <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center mx-auto shadow-inner">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-extrabold text-sm text-[var(--text)]">MFA is Active</p>
                        <p className="text-xs text-[var(--text-muted)] font-medium">Your login is securely protected with TOTP tokens.</p>
                      </div>
                      <button 
                        onClick={disable2FA} 
                        className="btn-secondary w-full text-red-500 border-red-500/20 hover:bg-red-500/5 text-xs uppercase tracking-wider font-bold"
                      >
                        Disable 2FA
                      </button>
                    </div>
                  ) : mfaData ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-4"
                    >
                      <div className="p-3 bg-black/5 dark:bg-black/20 rounded-2xl text-[11px] font-medium leading-relaxed text-[var(--text-muted)]">
                        1. Scan the QR code using Google Authenticator, Duo, or any TOTP client.
                      </div>
                      
                      {/* Premium QR Code Container */}
                      <div className="bg-white p-5 rounded-2xl flex justify-center border border-black/5 shadow-inner max-w-[190px] mx-auto">
                        <QRCode value={mfaData.uri} size={150} fgColor="#090d16" />
                      </div>
                      
                      <div className="p-3 bg-black/5 dark:bg-black/20 rounded-2xl text-[11px] font-medium leading-relaxed text-[var(--text-muted)]">
                        2. Verify by entering the 6-digit code displayed.
                      </div>
                      
                      <div className="flex gap-2">
                         <input 
                           type="text" 
                           maxLength={6} 
                           placeholder="000000" 
                           className="input text-center font-mono tracking-widest text-base flex-1 bg-white/50 dark:bg-black/20" 
                           value={otpCode} 
                           onChange={e => setOtpCode(e.target.value)} 
                         />
                         <button 
                           onClick={verify2FA} 
                           className="btn-primary py-2.5 px-5 bg-gradient-to-r from-indigo-500 to-indigo-600 border-none text-xs uppercase tracking-wider font-bold"
                         >
                           Verify
                         </button>
                      </div>
                      <button 
                        onClick={() => setMfaData(null)} 
                        className="text-[10px] font-bold text-center block mx-auto text-[var(--text-muted)] hover:text-[var(--text)] uppercase tracking-wider mt-2 transition-colors"
                      >
                        Cancel Setup
                      </button>
                    </motion.div>
                  ) : (
                    <div className="space-y-5">
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed font-medium">
                        Protect your dashboard, budgets, and secure files by requiring a generated Authenticator passcode upon sign-in.
                      </p>
                      
                      <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4 flex gap-3 items-center">
                        <Smartphone className="w-8 h-8 text-indigo-500 shrink-0 opacity-80" />
                        <div className="text-[11px] text-[var(--text-muted)] font-medium leading-relaxed">
                          Requires an authenticator app (e.g., Google Authenticator, Bitwarden, or iOS Settings Passwords).
                        </div>
                      </div>

                      <button 
                        onClick={generate2FA} 
                        className="btn-primary w-full py-3.5 bg-gradient-to-r from-indigo-500 to-indigo-600 border-none shadow-lg shadow-indigo-500/20 text-xs uppercase tracking-wider font-bold"
                      >
                        Enable Two-Factor
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'master-key' && (
          <motion.div 
            key="master-key"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.3 }}
            className="max-w-2xl mx-auto"
          >
            <MasterKeyChange />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Crop Modal */}
      <AnimatePresence>
        {tempImage && (
          <ImageCropper 
              image={tempImage} 
              onCrop={handleCroppedImage} 
              onCancel={() => setTempImage(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  )
}
