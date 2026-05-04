import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Shield, Key, Target, Settings as SettingsIcon } from 'lucide-react'
import {
  LayoutDashboard, ArrowLeftRight, Wallet, Tags,
  Calendar, Menu, X, ListTodo, LogOut, ChevronDown, Sun, Moon, Download, Clapperboard
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { healthApi } from '../api/client'
import { clsx } from '../utils/helpers'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import OnboardingModal from './OnboardingModal'

const NAV_ITEMS = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/transactions', icon: ArrowLeftRight,  label: 'Transactions' },
  { to: '/accounts',     icon: Wallet,          label: 'Accounts'     },
  { to: '/categories',   icon: Tags,            label: 'Categories'   },
  { to: '/calendar',     icon: Calendar,        label: 'Calendar'     },
  { to: '/todo',         icon: ListTodo,        label: 'To-Do'        },
  { to: '/passwords',    icon: Key,             label: 'Passwords'    },
  { to: '/vault',        icon: Shield,          label: 'Secure Vault' },
  { to: '/budgets',      icon: Target,          label: 'Budget Goals' },
  { to: '/popcorn',      icon: Clapperboard,    label: 'Popcorn'      },
  { to: '/settings',     icon: SettingsIcon,    label: 'Settings'     },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user, logout, refreshUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (user && !user.has_seen_onboarding) {
      setShowOnboarding(true)
    }
  }, [user])

  // ✅ PWA INSTALL STATE
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

  // ✅ THEME STATE

  const [darkMode, setDarkMode] = useState(true)

  // ✅ KEEP ALIVE (To prevent Render sleep)
  useEffect(() => {
    // Initial ping
    healthApi.ping()

    // Interval every 1 minute
    const interval = setInterval(() => {
      healthApi.ping()
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  // ✅ LOAD DEFAULT (DARK)
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

  // ✅ TOGGLE FUNCTION
  const toggleTheme = () => {
    if (darkMode) {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    }
    setDarkMode(!darkMode)
  }

  const currentPage = NAV_ITEMS.find(n => location.pathname.startsWith(n.to))?.label || ''

  const handleLogout = () => {
    logout()
    toast.success('Signed out')
    navigate('/login')
  }

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* Sidebar */}
      <aside className={clsx(
        'fixed lg:static inset-y-0 left-0 z-50 lg:z-auto',
        'w-64 flex flex-col',
        'transition-transform duration-300 ease-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
      style={{ background: 'var(--card)', borderRight: '1px solid var(--border)' }}
      >

        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4"
             style={{ borderBottom: '1px solid var(--border)' }}>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 flex-shrink-0 bg-slate-800 flex items-center justify-center">
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <img src="/logo.png" alt="Budget Tracker" className="w-full h-full object-cover" onError={e => { e.target.style.display='none' }} />
              )}
            </div>
            <div>
              <div className="font-semibold text-sm">{user?.name || "Budget"}</div>
              <div className="text-xs opacity-60">Budget Tracker Pro</div>
            </div>
          </div>

          <button onClick={() => setSidebarOpen(false)} className="lg:hidden opacity-60 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                   'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative group overflow-hidden',
                   isActive ? 'font-semibold' : 'opacity-70 hover:opacity-100 hover:bg-white/5'
                )
              }
              style={({ isActive }) => ({
                background: isActive ? 'var(--primary)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text)'
              })}
            >
              <motion.div
                className="flex items-center gap-3 w-full relative z-10"
                whileHover={{ x: 4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <Icon className="w-4 h-4" />
                {label}
              </motion.div>
              
              {location.pathname.startsWith(to) && (
                <motion.div
                  layoutId="active-nav"
                  className="absolute inset-0 bg-[var(--primary)] z-0"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </NavLink>
          ))}

          {/* PWA Install Button */}
          {showInstallBtn && (
            <button
              onClick={handleInstallClick}
              className="w-full mt-4 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.02] transition-all shadow-md"
            >
              <Download className="w-4 h-4" />
              Install Desktop App
            </button>
          )}
        </nav>



      </aside>
      
      {/* Sidebar Overlay (Mobile Only) */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col">

        {/* Header */}
        <header
          className="h-16 flex items-center justify-between px-4 lg:px-6 shadow-sm z-10 relative"
          style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-semibold text-base sm:text-lg truncate">{currentPage}</h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Custom Animated Theme Toggle */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 mr-0 sm:mr-4">
              <span className={`hidden md:inline text-sm font-bold transition-opacity duration-300 tracking-wide ${!darkMode ? 'opacity-100' : 'opacity-40'}`} style={{ color: 'var(--text)' }}>Light</span>
              
              <motion.button
                onClick={toggleTheme}
                className="w-14 h-7 rounded-full relative flex items-center focus:outline-none overflow-hidden"
                animate={{ 
                  backgroundColor: !darkMode ? '#709BFD' : '#232D3F',
                  borderColor: darkMode ? '#334155' : 'transparent'
                }}
                transition={{ duration: 0.5 }}
                style={{ border: '1px solid transparent' }}
              >
                {/* Deco Elements */}
                <AnimatePresence>
                  {!darkMode && (
                    <motion.div 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="absolute inset-0 flex justify-end items-center px-2"
                    >
                      <div className="flex gap-0.5">
                        <div className="w-1 h-1 bg-white rounded-full opacity-80 mt-2"></div>
                        <div className="w-1.5 h-1.5 bg-white rounded-full opacity-90"></div>
                      </div>
                    </motion.div>
                  )}
                  {darkMode && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="absolute inset-0 flex justify-start items-center px-1.5"
                    >
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        <div className="text-white opacity-80 text-[10px] leading-none ml-1">✧</div>
                        <div className="w-0.5 h-0.5 bg-white rounded-full opacity-70 ml-2"></div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* The Handle */}
                <motion.div 
                  className="absolute rounded-full flex items-center justify-center z-10"
                  animate={{ 
                    x: darkMode ? 33 : 5,
                    backgroundColor: darkMode ? 'transparent' : '#ffffff',
                    boxShadow: darkMode ? 'inset -5px -2px 0 0px #ffffff' : '0 1px 4px rgba(0,0,0,0.2)',
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  style={{ 
                    width: '18px',
                    height: '18px',
                  }}
                />
              </motion.button>
              
              <span className={`hidden sm:inline text-sm font-bold transition-opacity duration-300 tracking-wide ${darkMode ? 'opacity-100' : 'opacity-40'}`} style={{ color: 'var(--text)' }}>Dark</span>
            </div>
            
            <button
              onClick={handleLogout}
              className="p-2 sm:px-4 sm:py-2 flex items-center gap-2 rounded-full text-sm font-semibold transition-all hover:scale-105 hover:text-red-500 hover:border-red-200"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="responsive-container">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 1.01 }}
                className="w-full max-w-full"
                transition={{ 
                  duration: 0.25, 
                  ease: [0.23, 1, 0.32, 1] // Out-quartic
                }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

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