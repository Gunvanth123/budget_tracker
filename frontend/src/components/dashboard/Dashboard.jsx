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
import QuickActions from './QuickActions'

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
    <div className="space-y-6 pb-10">
      <div className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <span className="w-1.5 h-6 bg-indigo-500 rounded-full" />
          Quick Access
        </h2>
        {/* Quick Actions Services */}
        <QuickActions 
          onAddTransaction={() => setFormOpen(true)} 
          usage={data?.quick_access} 
        />
      </div>

      <div className="pt-2 space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <span className="w-1.5 h-6 bg-emerald-500 rounded-full" />
          Financial Overview
        </h2>
        {/* Summary Cards */}
        <SummaryCards summary={data?.summary} />
      </div>

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
