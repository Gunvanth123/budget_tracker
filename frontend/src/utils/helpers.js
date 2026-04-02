import { format, parseISO } from 'date-fns'

export const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0)
}

export const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr)
  return format(d, 'dd MMM yyyy')
}

export const formatDateInput = (dateStr) => {
  if (!dateStr) return ''
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr)
  return format(d, "yyyy-MM-dd'T'HH:mm")
}

export const todayISO = () => {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 16)
}

export const ACCOUNT_TYPES = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank Account' },
  { value: 'upi', label: 'UPI / Digital Wallet' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'savings', label: 'Savings Account' },
  { value: 'other', label: 'Other' },
]

export const ACCOUNT_TYPE_ICONS = {
  cash: '💵',
  bank: '🏦',
  upi: '📱',
  credit_card: '💳',
  savings: '🏧',
  other: '💼',
}

export const CATEGORY_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#3b82f6',
  '#a855f7', '#f43f5e', '#10b981', '#6b7280', '#f59e0b',
]

export const clsx = (...classes) => classes.filter(Boolean).join(' ')
