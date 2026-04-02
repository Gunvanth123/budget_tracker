import { useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight, Wallet, Tags,
  Calendar, Menu, X, TrendingUp, ListTodo, LogOut, ChevronDown
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
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

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
    <div className="flex h-screen overflow-hidden bg-surface-1">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'fixed lg:static inset-y-0 left-0 z-50 lg:z-auto',
        'w-64 bg-white border-r border-slate-100 flex flex-col',
        'transition-transform duration-300 ease-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center shadow-sm">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-display font-bold text-slate-800 text-sm leading-none">Budget</div>
              <div className="text-[10px] font-semibold text-brand-500 tracking-widest uppercase">Tracker</div>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 mt-1">
            Main Menu
          </p>
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => clsx('nav-link', isActive && 'active')}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-slate-100">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(p => !p)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
            >
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-semibold text-slate-700 truncate">{user?.name || 'User'}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>
              <ChevronDown className={clsx('w-3.5 h-3.5 text-slate-400 transition-transform', userMenuOpen && 'rotate-180')} />
            </button>

            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-display font-bold text-slate-800 text-lg leading-none">{currentPage}</h1>
              <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </div>
            {/* Mobile user avatar */}
            <button
              onClick={() => { setSidebarOpen(false); handleLogout() }}
              className="lg:hidden flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-500 px-2 py-1.5 rounded-xl hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="animate-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
