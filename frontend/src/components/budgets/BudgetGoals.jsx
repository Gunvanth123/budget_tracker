import { useState, useEffect } from 'react'
import { categoriesApi, budgetsApi, dashboardApi } from '../../api/client'
import toast from 'react-hot-toast'
import { Target, TrendingDown, CheckCircle } from 'lucide-react'

export default function BudgetGoals() {
  const [categories, setCategories] = useState([])
  const [budgets, setBudgets] = useState([])
  const [expenses, setExpenses] = useState({})
  const [loading, setLoading] = useState(true)

  const currentMonth = new Date().toISOString().slice(0, 7)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [catsRes, budgetsRes, dashboardRes] = await Promise.all([
        categoriesApi.getAll(),
        budgetsApi.getAll(currentMonth),
        dashboardApi.get()
      ])
      
      const expCats = catsRes.filter(c => c.type === 'expense')
      setCategories(expCats)
      setBudgets(budgetsRes)

      const expMap = {}
      dashboardRes.expense_by_category?.forEach(item => {
        // Map category NAME (lowercase) to its AMOUNT spent for robust matching
        expMap[item.category.toLowerCase().trim()] = item.amount
      })
      setExpenses(expMap)
    } catch {
      toast.error('Failed to load budget data')
    } finally {
      setLoading(false)
    }
  }

  const handleBudgetChange = async (catId, value) => {
    const amount = parseFloat(value) || 0
    try {
      await budgetsApi.set({
        category_id: catId,
        amount: amount,
        month_year: currentMonth
      })
      fetchData() // refresh data quietly
    } catch {
      toast.error('Failed to update limit')
    }
  }

  if (loading) return <div className="card p-12 text-center loader">Loading Budgets...</div>

  return (
    <div className="space-y-5">
      <div className="card p-6 bg-gradient-to-r from-blue-500 to-teal-400 text-white shadow-lg">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Target className="w-6 h-6" /> Budget Goals ({currentMonth})
        </h2>
        <p className="text-sm opacity-90 mt-1">
          Set monthly spending limits for your categories. Our AI advisor will use these to coach you.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(cat => {
          const budget = budgets.find(b => b.category_id === cat.id)
          const limit = budget ? budget.amount : 0
          // Use Case-Insensitive matching for Spent amounts
          const spent = expenses[cat.name.toLowerCase().trim()] || 0
          const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0
          
          let color = '#22C55E' // green
          if (percentage > 75) color = '#EAB308' // yellow
          if (percentage >= 100) color = '#EF4444' // red

          return (
            <div key={cat.id} className="card p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded flex items-center justify-center text-white" style={{ backgroundColor: cat.color }}>
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold" style={{ color: 'var(--text)' }}>{cat.name}</h3>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium tracking-wide" style={{ color: 'var(--text-muted)' }}>SET LIMIT</p>
                  <input
                    type="number"
                    defaultValue={limit}
                    onBlur={(e) => handleBudgetChange(cat.id, e.target.value)}
                    className="w-24 text-right border-b-2 outline-none font-bold mt-1 pl-1"
                    style={{ 
                      backgroundColor: 'transparent', 
                      color: 'var(--text)', 
                      borderBottomColor: 'var(--border)',
                      caretColor: 'var(--primary)'
                    }}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {limit > 0 ? (
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>
                    <span>Spent: ₹{spent}</span>
                    <span>{percentage.toFixed(0)}%</span>
                  </div>
                  <div className="w-full rounded-full h-2.5" style={{ backgroundColor: 'var(--border)' }}>
                    <div className="h-2.5 rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: color }}></div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-gray-400 italic">
                  <CheckCircle className="w-3 h-3" /> No limit set
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
