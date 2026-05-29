import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Shield, Key, Target, Settings as SettingsIcon, LayoutDashboard,
  ArrowLeftRight, Wallet, Tags, Calendar, Menu, X, ListTodo,
  LogOut, Download, Clapperboard, BarChart2, MoreHorizontal, Plus
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { healthApi } from '../api/client'
import { clsx } from '../utils/helpers'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import OnboardingModal from './OnboardingModal'
import TransactionForm from './transactions/TransactionForm'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/accounts', icon: Wallet, label: 'Accounts' },
  { to: '/categories', icon: Tags, label: 'Categories' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/todo', icon: ListTodo, label: 'To-Do' },
  { to: '/passwords', icon: Key, label: 'Passwords' },
  { to: '/vault', icon: Shield, label: 'Secure Vault' },
  { to: '/budgets', icon: Target, label: 'Budget Goals' },
  { to: '/settings', icon: SettingsIcon, label: 'Settings' },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [txnFormOpen, setTxnFormOpen] = useState(false)
  const { user, logout, refreshUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (user && !user.has_seen_onboarding) {
      setShowOnboarding(true)
    }
  }, [user])

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallBtn, setShowInstallBtn] = useState(false)

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallBtn(true)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', () => {
      setShowInstallBtn(false)
      setDeferredPrompt(null)
      toast.success('App installed successfully!')
    })
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowInstallBtn(false)
      setDeferredPrompt(null)
    }
  }

  // Theme State
  const [darkMode, setDarkMode] = useState(true)

  // Keep Alive
  useEffect(() => {
    healthApi.ping()
    const interval = setInterval(() => {
      healthApi.ping()
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Load default theme (Dark)
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'light') {
      document.documentElement.classList.remove('dark')
      setDarkMode(false)
    } else {
      document.documentElement.classList.add('dark')
      setDarkMode(true)
    }
  }, [])

  const toggleTheme = () => {
    const applyChange = () => {
      if (darkMode) {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', 'light')
      } else {
        document.documentElement.classList.add('dark')
        localStorage.setItem('theme', 'dark')
      }
      setDarkMode(!darkMode)
    }

    // Use View Transitions API for the circular reveal animation (Chrome/Edge/Safari)
    if (document.startViewTransition) {
      document.startViewTransition(applyChange)
    } else {
      applyChange()
    }
  }

  const currentPage = NAV_ITEMS
    .find(n => location.pathname.startsWith(n.to))?.label || 'Dashboard'

  // Routes handled by the 4 bottom tabs — everything else is a "More" route
  const BOTTOM_TAB_ROUTES = ['/dashboard', '/accounts', '/analytics']
  const isMoreRoute = !BOTTOM_TAB_ROUTES.some(r => location.pathname.startsWith(r))
  const moreActive = sidebarOpen || isMoreRoute

  const handleLogout = () => {
    logout()
    toast.success('Signed out')
    navigate('/login')
  }

  // Close sidebar on navigate
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  return (
    <div className="flex h-screen overflow-hidden relative" style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* Background ambient light blobs */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[160px] pointer-events-none z-0" />

      {/* PERSISTENT SIDEBAR - DISABLED */}
      <aside
        className="hidden w-72 flex-col flex-shrink-0 z-20 border-r"
        style={{ background: 'var(--card)', borderColor: 'var(--border)', backdropFilter: 'blur(25px)', WebkitBackdropFilter: 'blur(25px)' }}
      >
        {/* Profile Card Header */}
        <div className="h-20 flex items-center gap-3 px-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 flex-shrink-0 bg-slate-800 flex items-center justify-center">
            {user?.profile_picture ? (
              <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none' }} />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm truncate">{user?.name || "Gunyanth"}</div>
            <div className="text-xs opacity-50 font-medium">Budget Tracker Pro</div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto no-scrollbar">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all relative overflow-hidden group',
                  isActive ? 'text-white' : 'opacity-70 hover:opacity-100 hover:bg-white/5'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="w-5 h-5 relative z-10 shrink-0" />
                  <span className="relative z-10">{label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="active-nav-desktop"
                      className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 z-0"
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}

          {/* Desktop PWA Install Button */}
          {showInstallBtn && (
            <button
              onClick={handleInstallClick}
              className="w-full mt-4 flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.02] active:scale-95 transition-all shadow-md"
            >
              <Download className="w-4 h-4" />
              Install Desktop App
            </button>
          )}
        </nav>

        {/* Desktop Bottom Log out */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold opacity-70 hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition-all"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      {/* MOBILE DRAWER SIDEBAR (SLIDE-OUT) */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 w-80 flex flex-col z-50 shadow-2xl"
              style={{ background: 'var(--card)', borderColor: 'var(--border)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)' }}
            >
              <div className="h-20 flex items-center justify-between px-6 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 flex-shrink-0 bg-slate-800 flex items-center justify-center">
                    {user?.profile_picture ? (
                      <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-sm">{user?.name || "Gunyanth"}</div>
                    <div className="text-xs opacity-50 font-medium">Budget Tracker Pro</div>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-full hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation links inside drawer */}
              <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto no-scrollbar">
                {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all relative overflow-hidden group',
                        isActive ? 'text-white' : 'opacity-70 hover:opacity-100 hover:bg-white/5'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className="w-5 h-5 relative z-10 shrink-0" />
                        <span className="relative z-10">{label}</span>
                        {isActive && (
                          <motion.div
                            layoutId="active-nav-drawer"
                            className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 z-0"
                            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                          />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>


            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">

        {/* HEADER */}
        <header
          className="h-16 flex items-center justify-between px-6 z-20 border-b"
          style={{ background: 'var(--card)', borderColor: 'var(--border)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              onClick={() => navigate('/settings')}
              className="w-9 h-9 rounded-full overflow-hidden border border-black/10 dark:border-white/10 flex-shrink-0 bg-slate-200 dark:bg-slate-800 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm"
              title="Profile Settings"
            >
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none' }} />
              )}
            </div>
            <h1 className="font-bold text-lg tracking-wide">{currentPage}</h1>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* Custom Theme Switcher */}
            <div className="flex items-center gap-2">
              <span className={`hidden md:inline text-xs font-bold uppercase tracking-wider transition-opacity duration-300 ${!darkMode ? 'opacity-100' : 'opacity-40'}`}>Light</span>
              <button
                onClick={toggleTheme}
                className="w-12 h-6 rounded-full relative flex items-center bg-slate-200 dark:bg-slate-800 border dark:border-slate-700 focus:outline-none"
              >
                <motion.div
                  className="w-5 h-5 rounded-full bg-white dark:bg-indigo-500 shadow-md absolute"
                  animate={{ x: darkMode ? 24 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
              <span className={`hidden md:inline text-xs font-bold uppercase tracking-wider transition-opacity duration-300 ${darkMode ? 'opacity-100' : 'opacity-40'}`}>Dark</span>
            </div>

            {/* Mobile icon-only logout (hidden on lg+) */}
            <button
              onClick={handleLogout}
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-full text-red-500 hover:bg-red-500/10 transition-all border"
              style={{ borderColor: 'rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.06)' }}
              title="Logout"
            >
              <LogOut className="w-4 h-4 text-red-500" />
            </button>

            {/* Desktop text+icon logout (hidden below lg) */}
            <button
              onClick={handleLogout}
              className="hidden lg:flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border text-red-500 hover:bg-red-500/10 transition-all"
              style={{ borderColor: 'rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.06)' }}
            >
              <LogOut className="w-3.5 h-3.5 text-red-500" />
              Logout
            </button>
          </div>
        </header>

        {/* MAIN BODY */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-28">
          <div className="responsive-container">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 12, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 1.005 }}
                className="w-full max-w-full"
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* BOTTOM TAB NAVIGATION */}
        <nav
          className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] md:w-[480px] h-[74px] sm:h-[80px] border-2 rounded-full z-30 grid grid-cols-5 items-center justify-items-center px-2"
          style={{
            background: darkMode ? 'rgba(10, 11, 18, 0.2)' : 'rgba(255, 255, 255, 0.78)',
            borderColor: darkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.14)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            boxShadow: darkMode
              ? '0 25px 60px -10px rgba(0, 0, 0, 0.85), 0 0 25px 4px rgba(0, 0, 0, 0.7), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.18)'
              : '0 8px 32px -4px rgba(31, 38, 135, 0.18), 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.9)'
          }}
        >
          {/* Dashboard Tab */}
          <NavLink
            to="/dashboard"
            className="relative flex flex-col items-center justify-center w-full max-w-[72px] sm:max-w-[88px] py-1 sm:py-2 h-[46px] sm:h-[50px] rounded-full transition-all duration-300"
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="active-tab-glow"
                    className="absolute inset-x-[-2px] sm:inset-x-[-4px] inset-y-[-2px] sm:inset-y-[-2px] rounded-full border-2 z-0"
                    style={{
                      background: darkMode ? 'rgba(255, 255, 255, 0.07)' : 'rgba(255, 255, 255, 0.55)',
                      borderColor: darkMode ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.06)',
                      backdropFilter: 'blur(6px)',
                      WebkitBackdropFilter: 'blur(6px)',
                      boxShadow: darkMode
                        ? '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px 3px rgba(59, 130, 246, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.2)'
                        : '0 10px 25px -5px rgba(31, 38, 135, 0.15), 0 0 15px 3px rgba(59, 130, 246, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.9)'
                    }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <LayoutDashboard strokeWidth={2.5} className={clsx("w-5 h-5 relative z-10 transition-all duration-300", isActive ? (darkMode ? "text-blue-400 scale-[1.18] drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "text-blue-600 scale-[1.18]") : (darkMode ? "text-slate-400 opacity-60 scale-100" : "text-slate-500 scale-100"))} />
                <span className={clsx("text-[9px] font-bold tracking-wider mt-0.5 relative z-10 transition-colors duration-300", isActive ? (darkMode ? "text-blue-400" : "text-blue-600") : (darkMode ? "text-slate-400 opacity-60" : "text-slate-500"))}>Home</span>
              </>
            )}
          </NavLink>

          {/* Accounts Tab */}
          <NavLink
            to="/accounts"
            className="relative flex flex-col items-center justify-center w-full max-w-[72px] sm:max-w-[88px] py-1 sm:py-2 h-[46px] sm:h-[50px] rounded-full transition-all duration-300"
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="active-tab-glow"
                    className="absolute inset-x-[-2px] sm:inset-x-[-4px] inset-y-[-2px] sm:inset-y-[-2px] rounded-full border-2 z-0"
                    style={{
                      background: darkMode ? 'rgba(255, 255, 255, 0.07)' : 'rgba(255, 255, 255, 0.55)',
                      borderColor: darkMode ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.06)',
                      backdropFilter: 'blur(6px)',
                      WebkitBackdropFilter: 'blur(6px)',
                      boxShadow: darkMode
                        ? '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px 3px rgba(59, 130, 246, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.2)'
                        : '0 10px 25px -5px rgba(31, 38, 135, 0.15), 0 0 15px 3px rgba(59, 130, 246, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.9)'
                    }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Wallet strokeWidth={2.5} className={clsx("w-5 h-5 relative z-10 transition-all duration-300", isActive ? (darkMode ? "text-blue-400 scale-[1.18] drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "text-blue-600 scale-[1.18]") : (darkMode ? "text-slate-400 opacity-60 scale-100" : "text-slate-500 scale-100"))} />
                <span className={clsx("text-[9px] font-bold tracking-wider mt-0.5 relative z-10 transition-colors duration-300", isActive ? (darkMode ? "text-blue-400" : "text-blue-600") : (darkMode ? "text-slate-400 opacity-60" : "text-slate-500"))}>Accounts</span>
              </>
            )}
          </NavLink>

          {/* Centered Floating Action Button + */}
          <div className="relative flex items-center justify-center">
            <button
              onClick={() => setTxnFormOpen(true)}
              className="w-[44px] h-[44px] sm:w-[50px] sm:h-[50px] rounded-full bg-gradient-to-tr from-[#3b82f6] to-[#8b5cf6] text-white flex items-center justify-center shadow-[0_6px_20px_rgba(59,130,246,0.35)] hover:scale-105 active:scale-95 transition-all relative z-20"
            >
              <Plus strokeWidth={2.5} className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </button>
          </div>

          {/* Analytics Tab */}
          <NavLink
            to="/analytics"
            className="relative flex flex-col items-center justify-center w-full max-w-[72px] sm:max-w-[88px] py-1 sm:py-2 h-[46px] sm:h-[50px] rounded-full transition-all duration-300"
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="active-tab-glow"
                    className="absolute inset-x-[-2px] sm:inset-x-[-4px] inset-y-[-2px] sm:inset-y-[-2px] rounded-full border-2 z-0"
                    style={{
                      background: darkMode ? 'rgba(255, 255, 255, 0.07)' : 'rgba(255, 255, 255, 0.55)',
                      borderColor: darkMode ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.06)',
                      backdropFilter: 'blur(6px)',
                      WebkitBackdropFilter: 'blur(6px)',
                      boxShadow: darkMode
                        ? '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px 3px rgba(59, 130, 246, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.2)'
                        : '0 10px 25px -5px rgba(31, 38, 135, 0.15), 0 0 15px 3px rgba(59, 130, 246, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.9)'
                    }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <BarChart2 strokeWidth={2.5} className={clsx("w-5 h-5 relative z-10 transition-all duration-300", isActive ? (darkMode ? "text-blue-400 scale-[1.18] drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "text-blue-600 scale-[1.18]") : (darkMode ? "text-slate-400 opacity-60 scale-100" : "text-slate-500 scale-100"))} />
                <span className={clsx("text-[9px] font-bold tracking-wider mt-0.5 relative z-10 transition-colors duration-300", isActive ? (darkMode ? "text-blue-400" : "text-blue-600") : (darkMode ? "text-slate-400 opacity-60" : "text-slate-500"))}>Analytics</span>
              </>
            )}
          </NavLink>

          {/* More Tab (Slides in Drawer) */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="relative flex flex-col items-center justify-center w-full max-w-[72px] sm:max-w-[88px] py-1 sm:py-2 h-[46px] sm:h-[50px] rounded-full transition-all duration-300"
          >
            {moreActive && (
              <motion.div
                layoutId="active-tab-glow"
                className="absolute inset-x-[-2px] sm:inset-x-[-4px] inset-y-[-2px] sm:inset-y-[-2px] rounded-full border-2 z-0"
                style={{
                  background: darkMode ? 'rgba(255, 255, 255, 0.07)' : 'rgba(255, 255, 255, 0.55)',
                  borderColor: darkMode ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.06)',
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                  boxShadow: darkMode
                    ? '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px 3px rgba(59, 130, 246, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.2)'
                    : '0 10px 25px -5px rgba(31, 38, 135, 0.15), 0 0 15px 3px rgba(59, 130, 246, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.9)'
                }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <MoreHorizontal strokeWidth={2.5} className={clsx("w-5 h-5 relative z-10 transition-all duration-300", moreActive ? (darkMode ? "text-blue-400 scale-[1.18] drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "text-blue-600 scale-[1.18]") : (darkMode ? "text-slate-400 opacity-60 scale-100" : "text-slate-500 scale-100"))} />
            <span className={clsx("text-[9px] font-bold tracking-wider mt-0.5 relative z-10 transition-all duration-300", moreActive ? (darkMode ? "text-blue-400" : "text-blue-600") : (darkMode ? "text-slate-400 opacity-60" : "text-slate-500"))}>More</span>
          </button>
        </nav>
      </div>

      {/* Transaction Entry Form Triggerable from anywhere */}
      <TransactionForm
        isOpen={txnFormOpen}
        onClose={() => setTxnFormOpen(false)}
        onSaved={() => window.dispatchEvent(new CustomEvent('transaction-saved'))}
      />

      {showOnboarding && (
        <OnboardingModal
          user={user}
          onComplete={() => {
            setShowOnboarding(false)
            refreshUser()
          }}
        />
      )}
    </div>
  )
}