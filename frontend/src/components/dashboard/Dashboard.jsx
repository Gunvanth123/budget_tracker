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

  const fetchDashboard = async () => {
    try {
      const d = await dashboardApi.get()
      setData(d)
    } catch (err) {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
    const interval = setInterval(fetchDashboard, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <SummaryCards summary={data?.summary} />

      {/* Charts Row — equal width, equal height */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        <ExpensePieChart data={data?.expense_by_category} />
        <MonthlyBarChart data={data?.monthly_comparison} />
      </div>

      {/* Daily Line Chart */}
      <DailyLineChart data={data?.daily_trends} />

      {/* Recent Transactions */}
      <RecentTransactions />
    </div>
  )
}
