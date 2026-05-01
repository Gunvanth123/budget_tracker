import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Shield, Key, Target, Settings as SettingsIcon } from 'lucide-react'
import {
  LayoutDashboard, ArrowLeftRight, Wallet, Tags,
  Calendar, Menu, X, ListTodo, LogOut, ChevronDown, Sun, Moon
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { clsx } from '../utils/helpers'
import toast from 'react-hot-toast'

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
  { to: '/settings',     icon: SettingsIcon,    label: 'Settings'     },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // ✅ THEME STATE
  const [darkMode, setDarkMode] = useState(true)

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
                <img src="/logo.png" alt="Budget Tracker" className="w-full h-full object-cover p-1.5" onError={e => { e.target.style.display='none' }} />
              )}
            </div>
            <div>
              <div className="font-semibold text-sm">{user?.name || "Budget"}</div>
              <div className="text-xs opacity-60">Tracker Pro</div>
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
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  isActive ? 'font-semibold' : 'opacity-70 hover:opacity-100'
                )
              }
              style={({ isActive }) => ({
                background: isActive ? 'var(--primary)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text)'
              })}
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
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
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-semibold text-lg">{currentPage}</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Custom Animated Theme Toggle */}
            <div className="flex items-center justify-center gap-3 mr-4">
              <span className={`text-sm font-bold transition-opacity duration-300 tracking-wide ${!darkMode ? 'opacity-100' : 'opacity-40'}`} style={{ color: 'var(--text)' }}>Light</span>
              
              <button
                onClick={toggleTheme}
                className="w-14 h-7 rounded-full relative flex items-center transition-colors duration-500 focus:outline-none"
                style={{ backgroundColor: !darkMode ? '#709BFD' : '#232D3F', border: darkMode ? '1px solid #334155' : 'none' }} 
              >
                {/* Deco Elements */}
                <div className={`absolute inset-0 flex justify-end items-center px-2 transition-opacity duration-500 ${!darkMode ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="flex gap-0.5">
                    <div className="w-1 h-1 bg-white rounded-full opacity-80 mt-2"></div>
                    <div className="w-1.5 h-1.5 bg-white rounded-full opacity-90"></div>
                  </div>
                </div>
                <div className={`absolute inset-0 flex justify-start items-center px-1.5 transition-opacity duration-500 ${darkMode ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    <div className="text-white opacity-80 text-[10px] leading-none ml-1">✧</div>
                    <div className="w-0.5 h-0.5 bg-white rounded-full opacity-70 ml-2"></div>
                  </div>
                </div>

                {/* The Handle */}
                <div 
                  className={`absolute rounded-full transition-all duration-500 flex items-center justify-center`}
                  style={{ 
                    width: '18px',
                    height: '18px',
                    left: '5px', 
                    transform: darkMode ? 'translateX(28px)' : 'translateX(0)',
                    backgroundColor: darkMode ? 'transparent' : '#ffffff',
                    boxShadow: darkMode ? 'inset -5px -2px 0 0px #ffffff' : '0 1px 4px rgba(0,0,0,0.2)',
                  }}
                >
                </div>
              </button>
              
              <span className={`text-sm font-bold transition-opacity duration-300 tracking-wide ${darkMode ? 'opacity-100' : 'opacity-40'}`} style={{ color: 'var(--text)' }}>Dark</span>
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

        <main className="flex-1 overflow-y-auto">
          <div className="responsive-container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}