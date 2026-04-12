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

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="flex flex-col items-center gap-4">

          {/* LOGO */}
          <div className="relative w-20 h-20">
            <img
              src="/assets/logo.png"
              className="w-20 h-20 rounded-full object-cover"
            />

            {/* ROTATING BORDER */}
            <div className="absolute inset-0 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin"></div>
          </div>

          <p className="text-sm opacity-70">Loading...</p>
        </div>
      </div>
    )
  }
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
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
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    <AIChatbot />
    </>
  )
}
