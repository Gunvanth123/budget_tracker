import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight, Wallet, Tags,
  Calendar, Menu, X, ListTodo, LogOut, ChevronDown, Sun, Moon, Key
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
            <img src="/logo.png" alt="Budget Tracker" className="w-9 h-9 rounded-full object-cover" onError={e => { e.target.style.display='none' }} />
            <div>
              <div className="font-semibold text-sm">Budget</div>
              <div className="text-xs opacity-60">Tracker</div>
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

        {/* Footer */}
        <div className="p-3 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>

          {/* ✅ THEME TOGGLE BUTTON */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'var(--primary)', color: '#fff' }}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>

          {/* User */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl"
            style={{ border: '1px solid var(--border)' }}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">

        {/* Header */}
        <header
          className="h-16 flex items-center justify-between px-4"
          style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}
        >
          <h1 className="font-semibold">{currentPage}</h1>
        </header>

        <main className="flex-1 p-4 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}