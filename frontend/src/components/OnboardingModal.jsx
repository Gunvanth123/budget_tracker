import { useState } from 'react'
import { createPortal } from 'react-dom'
import { 
  ShieldCheck, Lock, UploadCloud, PlusCircle, 
  Trash2, Edit3, FolderOpen, Key, ListTodo, 
  Popcorn, ShieldAlert, CheckCircle2, ChevronRight, X 
} from 'lucide-react'
import { usersApi } from '../api/client'

export default function OnboardingModal({ user, onComplete }) {
  const [step, setStep] = useState(1)
  const totalSteps = 4

  const handleComplete = async () => {
    try {
      await usersApi.completeOnboarding()
      onComplete()
    } catch (err) {
      console.error("Failed to mark onboarding as seen", err)
      onComplete() // Still close it
    }
  }

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1)
    else handleComplete()
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-500" />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-[var(--card)] rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        
        {/* Header - Fixed */}
        <div className="p-8 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold">Welcome Onboard!</h2>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map(i => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-500 ${step === i ? 'w-8 bg-[var(--primary)]' : 'w-2 bg-[var(--border)]'}`} 
              />
            ))}
          </div>
        </div>

        {/* Content - Scrollable if needed */}
        <div className="flex-1 overflow-y-auto p-8 pt-2">
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
              <div className="space-y-2">
                <h1 className="text-3xl font-black tracking-tight leading-tight">
                  Hi {user?.name || 'there'}! <br />
                  <span className="text-[var(--primary)]">Glad to have you onboard.</span>
                </h1>
                <p className="text-lg opacity-70">Let me give you a quick overview of the application I made for you.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Military-Grade Security</h3>
                    <p className="text-xs opacity-60">All your data is end-to-end encrypted with your master password.</p>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Zero Data Breach</h3>
                    <p className="text-xs opacity-60">Connect Google Drive to store files only in your own cloud account.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Smart Financial Tracking</h2>
                <p className="text-sm opacity-70">Take full control of your money with intuitive tools.</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {[
                  { icon: <PlusCircle className="text-emerald-500" />, title: "Add Transactions", desc: "Record income and expenses in seconds with smart tagging." },
                  { icon: <Edit3 className="text-blue-500" />, title: "Modify & Manage", desc: "Easily update or delete entries to keep your books accurate." },
                  { icon: <FolderOpen className="text-amber-500" />, title: "Organize Categories", desc: "Create custom categories to see exactly where your money goes." }
                ].map((f, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)] group hover:border-[var(--primary)]/50 transition-colors">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-sm shrink-0">{f.icon}</div>
                    <div>
                      <h4 className="font-bold text-sm">{f.title}</h4>
                      <p className="text-xs opacity-60 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Your Digital Command Center</h2>
                <p className="text-sm opacity-70">Beyond budgets, your app handles your entire digital life.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-[var(--bg)] border border-[var(--border)] space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/20"><Key className="w-5 h-5" /></div>
                  <h4 className="font-bold text-sm">Password Manager</h4>
                  <p className="text-xs opacity-60">Store logins securely with zero-knowledge AES-256 encryption.</p>
                </div>
                <div className="p-5 rounded-2xl bg-[var(--bg)] border border-[var(--border)] space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20"><ListTodo className="w-5 h-5" /></div>
                  <h4 className="font-bold text-sm">To-Do Lists</h4>
                  <p className="text-xs opacity-60">Organize your daily tasks and achieve your goals faster.</p>
                </div>
                <div className="p-5 rounded-2xl bg-[var(--bg)] border border-[var(--border)] space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20"><Lock className="w-5 h-5" /></div>
                  <h4 className="font-bold text-sm">Secure Vault</h4>
                  <p className="text-xs opacity-60">Upload files into encrypted categories for perfect organization.</p>
                </div>
                <div className="p-5 rounded-2xl bg-[var(--bg)] border border-[var(--border)] space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-500 text-white flex items-center justify-center shadow-lg shadow-pink-500/20"><Popcorn className="w-5 h-5" /></div>
                  <h4 className="font-bold text-sm">Popcorn Tracker</h4>
                  <p className="text-xs opacity-60">Personal watchlist of movies and shows with AI-powered synopses.</p>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8 animate-in slide-in-from-right-8 duration-500 py-4">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto ring-8 ring-emerald-500/5">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-black">All Set!</h2>
                  <p className="text-lg opacity-70 px-4">Your privacy is our priority. Enable 2-Step Authentication in settings for maximum security.</p>
                </div>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/10 p-5 rounded-3xl flex gap-4 items-start">
                <ShieldAlert className="w-6 h-6 text-amber-500 shrink-0 mt-1" />
                <p className="text-sm text-amber-600 dark:text-amber-400 font-medium leading-relaxed">
                  Important: We never see your master password. Please keep it safe, as it's the only key to your encrypted data.
                </p>
              </div>

              <div className="text-center pt-4 opacity-70 italic text-sm">
                Thank you for choosing this application <br />
                <span className="font-bold not-italic text-base opacity-100">Gunvanth K</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Fixed */}
        <div className="p-8 pt-4 flex gap-4">
          {step > 1 && (
            <button 
              onClick={() => setStep(step - 1)}
              className="px-6 py-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)] font-bold text-sm hover:bg-[var(--border)] transition-colors"
            >
              Back
            </button>
          )}
          <button 
            onClick={nextStep}
            className="flex-1 py-4 bg-[var(--primary)] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-[var(--primary)]/30 hover:scale-[1.02] active:scale-95 transition-all"
          >
            {step === totalSteps ? "Get Started" : "Continue"}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
