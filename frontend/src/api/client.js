import axios from 'axios'

// In dev (no VITE_API_URL set): requests go to /api/... and Vite proxies to localhost:8000
// In prod: set VITE_API_URL=https://your-backend.onrender.com
const BASE_URL = import.meta.env.VITE_API_URL ?? ''

const api = axios.create({
  baseURL: BASE_URL ? `${BASE_URL}/api` : '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
})

export const accountsApi = {
  getAll: () => api.get('/accounts/').then(r => r.data),
  create: (data) => api.post('/accounts/', data).then(r => r.data),
  update: (id, data) => api.put(`/accounts/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/accounts/${id}`),
}

export const categoriesApi = {
  getAll: (type) => api.get('/categories/', { params: type ? { type } : {} }).then(r => r.data),
  create: (data) => api.post('/categories/', data).then(r => r.data),
  update: (id, data) => api.put(`/categories/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/categories/${id}`),
}

export const transactionsApi = {
  getAll: (params) => api.get('/transactions/', { params }).then(r => r.data),
  create: (data) => api.post('/transactions/', data).then(r => r.data),
  update: (id, data) => api.put(`/transactions/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/transactions/${id}`),
}

export const dashboardApi = {
  get: () => api.get('/dashboard/').then(r => r.data),
  getCalendar: () => api.get('/dashboard/calendar').then(r => r.data),
}

export const todoApi = {
  getLists: () => api.get('/todo/').then(r => r.data),
  createList: (title) => api.post('/todo/', { title }).then(r => r.data),
  updateList: (id, title) => api.put(`/todo/${id}`, { title }).then(r => r.data),
  deleteList: (id) => api.delete(`/todo/${id}`),
  createTask: (listId, title) => api.post(`/todo/${listId}/tasks`, { title }).then(r => r.data),
  updateTask: (listId, taskId, data) => api.put(`/todo/${listId}/tasks/${taskId}`, data).then(r => r.data),
  deleteTask: (listId, taskId) => api.delete(`/todo/${listId}/tasks/${taskId}`),
}

export const passwordsApi = {
  status: () => api.get('/passwords/status').then(r => r.data),
  setup: (master_password) => api.post('/passwords/setup', { master_password }).then(r => r.data),
  verify: (master_password) => api.post('/passwords/verify', { master_password }).then(r => r.data),
  getAll: () => api.get('/passwords/').then(r => r.data),
  create: (data) => api.post('/passwords/', data).then(r => r.data),
  update: (id, data) => api.put(`/passwords/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/passwords/${id}`),
}

export const budgetsApi = {
  getAll: (month_year) => api.get('/budgets/', { params: { month_year } }).then(r => r.data),
  set: (data) => api.post('/budgets/', data).then(r => r.data)
}

export const usersApi = {
  getMe: () => api.get('/users/me').then(r => r.data),
  updateProfile: (data) => api.put('/users/profile', data).then(r => r.data),
  updateEmail: (data) => api.put('/users/email', data).then(r => r.data),
  updatePassword: (data) => api.put('/users/password', data).then(r => r.data),
}

export const mfaApi = {
  generate: () => api.post('/auth/2fa/generate').then(r => r.data),
  verify: (otp_code) => api.post('/auth/2fa/verify', { otp_code }).then(r => r.data),
  disable: (otp_code) => api.post('/auth/2fa/disable', { otp_code }).then(r => r.data),
}

export const aiApi = {
  chat: (prompt) => api.post('/ai/chat', { prompt }).then(r => r.data),
}

export default api
