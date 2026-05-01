import { useState, useEffect } from 'react'
import { dashboardApi } from '../../api/client'
import SummaryCards from './SummaryCards'
import ExpensePieChart from './ExpensePieChart'
import MonthlyBarChart from './MonthlyBarChart'
import DailyLineChart from './DailyLineChart'
import RecentTransactions from './RecentTransactions'
import toast from 'react-hot-toast'

import { Plus } from 'lucide-react'
import TransactionForm from '../transactions/TransactionForm'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [formOpen, setFormOpen] = useState(false)

  const fetchDashboard = async () => {
    try {
      const d = await dashboardApi.get(selectedMonth)
      setData(d)
    } catch (err) {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
    const interval = setInterval(fetchDashboard, 60000)
    return () => clearInterval(interval)
  }, [selectedMonth])

  const months = []
  const today = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    months.push(`${y}-${m}`)
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Overview</h2>
        <button
          onClick={() => setFormOpen(true)}
          className="btn-primary flex items-center gap-2 px-4 py-2 text-sm shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
          Add Transaction
        </button>
      </div>

      {/* Summary Cards */}
      <SummaryCards summary={data?.summary} />

      {/* Charts Row — equal width, equal height */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        <ExpensePieChart 
          data={data?.expense_by_category} 
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          months={months}
        />
        <MonthlyBarChart data={data?.monthly_comparison} />
      </div>

      {/* Daily Line Chart */}
      <DailyLineChart data={data?.daily_trends} />

      {/* Recent Transactions */}
      <RecentTransactions />

      {/* Modals */}
      <TransactionForm 
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={fetchDashboard}
      />
    </div>
  )
}
