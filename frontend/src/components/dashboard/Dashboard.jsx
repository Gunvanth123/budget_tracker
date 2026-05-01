import { useState, useEffect } from 'react'
import { dashboardApi } from '../../api/client'
import SummaryCards from './SummaryCards'
import ExpensePieChart from './ExpensePieChart'
import MonthlyBarChart from './MonthlyBarChart'
import DailyLineChart from './DailyLineChart'
import RecentTransactions from './RecentTransactions'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))

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
    </div>
  )
}
