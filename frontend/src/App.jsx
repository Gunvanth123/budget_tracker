import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Dashboard from './components/dashboard/Dashboard'
import Transactions from './components/transactions/Transactions'
import Accounts from './components/accounts/Accounts'
import Categories from './components/categories/Categories'
import CalendarView from './components/calendar/CalendarView'
import Todo from './components/todo/Todo'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import PasswordManager from './components/passwords/PasswordManager'
import BudgetGoals from './components/budgets/BudgetGoals'
import AIChatbot from './components/ai/AIChatbot'
import Settings from './components/settings/Settings'
import SecureVault from './components/vault/SecureVault'


function LoadingScreen() {
  const [showWakeMessage, setShowWakeMessage] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowWakeMessage(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]" style={{ color: 'var(--text)' }}>
      <div className="flex flex-col items-center gap-6 max-w-md px-6 text-center">
        {/* LOGO */}
        <div className="relative w-24 h-24">
          <img
            src="/logo.png"
            className="w-24 h-24 rounded-full object-cover shadow-2xl"
            alt="Logo"
          />
          {/* ROTATING BORDER */}
          <div className="absolute -inset-2 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin"></div>
        </div>

        <div className="space-y-2">
          <p className="text-lg font-medium animate-pulse">Initializing Application...</p>
          {showWakeMessage && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <p className="text-sm opacity-60">
                Waking up the server on Render Free Tier...
              </p>
              <p className="text-xs opacity-40 mt-1">
                This typically takes 30-45 seconds after inactivity.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  return user ? <Navigate to="/dashboard" replace /> : children
}


export default function App() {
  const { user } = useAuth()
  return (
    <>
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="categories" element={<Categories />} />
        <Route path="calendar" element={<CalendarView />} />
        <Route path="todo" element={<Todo />} />
        <Route path="passwords" element={<PasswordManager />} />
        <Route path="budgets" element={<BudgetGoals />} />
        <Route path="vault" element={<SecureVault />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    {user && <AIChatbot />}
    </>
  )
}
