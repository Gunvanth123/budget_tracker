import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('bt_token'))
  const [loading, setLoading] = useState(true)

  // Inject token into every axios request
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      localStorage.setItem('bt_token', token)
    } else {
      delete api.defaults.headers.common['Authorization']
      localStorage.removeItem('bt_token')
    }
  }, [token])

  // On mount: validate token and load user
  useEffect(() => {
    if (!token) { setLoading(false); return }
    api.get('/auth/me')
      .then(r => setUser(r.data))
      .catch(() => { setToken(null); setUser(null) })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    setToken(res.data.access_token)
    setUser(res.data.user)
    api.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`
    return res.data.user
  }, [])

  const register = useCallback(async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password })
    setToken(res.data.access_token)
    setUser(res.data.user)
    api.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`
    return res.data.user
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
