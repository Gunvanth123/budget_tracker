import { useState, useEffect } from 'react'
import { usersApi, mfaApi } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import QRCode from 'react-qr-code'
import toast from 'react-hot-toast'
import { User, Shield, Camera, CheckCircle2, Key } from 'lucide-react'
import ImageCropper from './ImageCropper'
import MasterKeyChange from './MasterKeyChange'

export default function Settings() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)

  // Profile data
  const [profile, setProfile] = useState({ name: '', email: '', profile_picture: '', totp_enabled: false })
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '' })
  
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
    <div className="max-w-4xl space-y-6">
      
      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-800 pb-2">
        <button 
          className={`flex items-center gap-2 pb-2 px-1 border-b-2 transition-colors ${activeTab === 'profile' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent opacity-60 hover:opacity-100'}`}
          onClick={() => setActiveTab('profile')}
        >
          <User className="w-4 h-4" /> Profile Info
        </button>
        <button 
          className={`flex items-center gap-2 pb-2 px-1 border-b-2 transition-colors ${activeTab === 'security' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent opacity-60 hover:opacity-100'}`}
          onClick={() => setActiveTab('security')}
        >
          <Shield className="w-4 h-4" /> Security & 2FA
        </button>
        <button 
          className={`flex items-center gap-2 pb-2 px-1 border-b-2 transition-colors ${activeTab === 'master-key' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent opacity-60 hover:opacity-100'}`}
          onClick={() => setActiveTab('master-key')}
        >
          <Key className="w-4 h-4" /> Master Key
        </button>
      </div>

      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="card p-6 flex flex-col">
            <h3 className="font-semibold text-lg border-b pb-2 mb-4">Avatar</h3>
            <div className="flex-1 flex flex-col justify-between">
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border-2 border-[var(--primary)] shrink-0">
                  {profile.profile_picture ? (
                    <img src={profile.profile_picture} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 opacity-30" />
                  )}
                  <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-6 h-6 text-white" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  </label>
                </div>
                <p className="text-sm opacity-60 max-w-[200px]">Click your avatar to upload a profile picture. Max size 2MB.</p>
              </div>

              <form onSubmit={handleProfileUpdate} className="pt-4 space-y-4">
                <div>
                  <label className="label">Public Name</label>
                  <input type="text" className="input" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} required />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">Save Profile</button>
              </form>
            </div>
          </div>

          <div className="card p-6 flex flex-col">
            <h3 className="font-semibold text-lg border-b pb-2 mb-4">Email Address</h3>
            <div className="flex-1 flex flex-col justify-between">
              <p className="text-xs opacity-60 mb-2">Notice: For security reasons, you can only change your registered email address once every 30 days.</p>
              <form onSubmit={handleEmailUpdate} className="space-y-4 pt-2">
                <div>
                  <label className="label">Primary Email</label>
                  <input type="email" className="input" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} required />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">Update Email</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="card p-6 space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2 mb-4">Change Password</h3>
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div>
                <label className="label">Current Password</label>
                <input type="password" required className="input" value={passwordForm.current_password} onChange={e => setPasswordForm({...passwordForm, current_password: e.target.value})} />
              </div>
              <div>
                <label className="label">New Password (min 6 chars)</label>
                <input type="password" required className="input" minLength={6} value={passwordForm.new_password} onChange={e => setPasswordForm({...passwordForm, new_password: e.target.value})} />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">Change Password</button>
            </form>
          </div>

          <div className="card p-6 flex flex-col">
            <h3 className="font-semibold text-lg border-b pb-2 mb-4">Two-Factor Authentication</h3>
            
            <div className="flex-1 flex flex-col justify-between">
              {profile.totp_enabled ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 p-4 rounded-xl">
                  <p className="font-semibold flex items-center gap-2 mb-1"><CheckCircle2 className="w-4 h-4" /> MFA is Active</p>
                  <p className="text-sm opacity-80 mb-4">Your account is secured with Google Authenticator.</p>
                  <button onClick={disable2FA} className="btn-secondary text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full">
                    Disable 2FA
                  </button>
                </div>
              ) : mfaData ? (
                <div className="space-y-4">
                  <p className="text-sm opacity-80">1. Scan this QR Code with Google Authenticator.</p>
                  <div className="bg-white p-6 rounded-2xl shadow-inner flex justify-center border border-gray-200">
                    <QRCode value={mfaData.uri} size={150} fgColor="#1e293b" />
                  </div>
                  <p className="text-sm opacity-80">2. Enter the generated 6-digit code below.</p>
                  <div className="flex gap-2">
                     <input type="text" maxLength={6} placeholder="000000" className="input text-center font-mono tracking-widest text-lg flex-1" value={otpCode} onChange={e => setOtpCode(e.target.value)} />
                     <button onClick={verify2FA} className="btn-primary whitespace-nowrap">Verify</button>
                  </div>
                  <button onClick={() => setMfaData(null)} className="text-sm opacity-60 hover:opacity-100 transition-opacity underline mt-2 block mx-auto">Cancel Setup</button>
                </div>
              ) : (
                <>
                  <p className="text-sm opacity-80">Add an extra layer of security to your account with a Google Authenticator TOTP token.</p>
                  <div className="pt-4">
                    <button onClick={generate2FA} className="btn-primary w-full flex items-center justify-center gap-2">
                      Setup Google Authenticator
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {activeTab === 'master-key' && (
        <div className="max-w-2xl mx-auto">
          <MasterKeyChange />
        </div>
      )}
      {/* Image Crop Modal */}
      {tempImage && (
        <ImageCropper 
            image={tempImage} 
            onCrop={handleCroppedImage} 
            onCancel={() => setTempImage(null)} 
        />
      )}
    </div>
  )
}
