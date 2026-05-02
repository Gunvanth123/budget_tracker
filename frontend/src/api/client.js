import axios from 'axios'

// In dev (no VITE_API_URL set): requests go to /api/... and Vite proxies to localhost:8000
// Sanitize URL to remove trailing slashes
const VITE_URL = import.meta.env.VITE_API_URL ?? ''
const BASE_URL = VITE_URL.endsWith('/') ? VITE_URL.slice(0, -1) : VITE_URL

const api = axios.create({
  baseURL: BASE_URL ? `${BASE_URL}/api` : '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

export const API_URL = BASE_URL

// Root API for health checks (outside /api prefix)
const rootApi = axios.create({
  baseURL: BASE_URL || '/',
  withCredentials: true,
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
  get: (month_year) => api.get('/dashboard/', { params: { month_year } }).then(r => r.data),
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
  getCategories: () => api.get('/passwords/categories').then(r => r.data),
  createCategory: (data) => api.post('/passwords/categories', data).then(r => r.data),
}

export const budgetsApi = {
  getAll: (month_year) => api.get('/budgets/', { params: { month_year } }).then(r => r.data),
  set: (data) => api.post('/budgets/', data).then(r => r.data)
}

export const vaultApi = {
  getAll: () => api.get('/vault/').then(r => r.data),
  upload: (formData) => api.post('/vault/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data),
  download: (id) => api.get(`/vault/${id}`).then(r => r.data),
  delete: (id) => api.delete(`/vault/${id}`).then(r => r.data),
  status: () => api.get('/vault/status').then(r => r.data),
  getCategories: () => api.get('/vault/categories').then(r => r.data),
  createCategory: (name) => api.post('/vault/categories', { name }).then(r => r.data),
  getAuthUrl: () => api.get('/vault/gdrive/auth-url').then(r => r.data),
  connectGDrive: (code) => api.post(`/vault/gdrive/connect?code=${code}`).then(r => r.data),
  getConfigStatus: () => api.get('/vault/gdrive/config-status').then(r => r.data),
}

export const usersApi = {
  getMe: () => api.get(`/auth/me?t=${Date.now()}`).then(r => r.data),
  updateProfile: (data) => api.put('/users/profile', data).then(r => r.data),
  updateEmail: (data) => api.put('/users/email', data).then(r => r.data),
  updatePassword: (data) => api.put('/users/password', data).then(r => r.data),
  completeOnboarding: () => api.put('/users/onboarding').then(r => r.data),
}

export const mfaApi = {
  generate: () => api.post('/auth/2fa/generate').then(r => r.data),
  verify: (otp_code) => api.post('/auth/2fa/verify', { otp_code }).then(r => r.data),
  disable: (otp_code) => api.post('/auth/2fa/disable', { otp_code }).then(r => r.data),
}

export const authApi = {
  register: (data) => api.post('/auth/register', data).then(r => r.data),
}

export const aiApi = {
  chat: (prompt, month_year) => api.post('/ai/chat', { prompt, month_year }).then(r => r.data),
  getHistory: (month_year) => api.get(`/ai/history/${month_year}`).then(r => r.data),
  clearHistory: (month_year) => api.delete(`/ai/history/${month_year}`).then(r => r.data),
}

export const popcornApi = {
  getAll: () => api.get('/popcorn/').then(r => r.data),
  create: (formData) => api.post('/popcorn/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data),
  update: (id, formData) => api.put(`/popcorn/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data),
  delete: (id) => api.delete(`/popcorn/${id}`).then(r => r.data),
  getSynopsis: (title, category, language) => api.get('/popcorn/ai-synopsis', { params: { title, category, language } }).then(r => r.data),
  extractPoster: (url) => api.get('/popcorn/extract-poster', { params: { url } }).then(r => r.data),
}

export const usageApi = {
  track: (feature_id) => api.post('/usage/track', { feature_id }).then(r => r.data),
  getTop: () => api.get('/usage/top').then(r => r.data),
}

export const healthApi = {
  ping: () => rootApi.get('/health').then(r => r.data).catch(() => ({ status: 'error' })),
}

export default api

