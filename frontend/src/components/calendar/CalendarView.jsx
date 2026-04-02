import { useState, useEffect } from 'react'
import { dashboardApi } from '../../api/client'
import { formatCurrency } from '../../utils/helpers'
import { format, startOfMonth, endOfMonth, eachDayOfInterval,
         startOfWeek, endOfWeek, isSameMonth, isToday, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import toast from 'react-hot-toast'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarView() {
  const [calendarData, setCalendarData] = useState({})
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedData, setSelectedData] = useState(null)

  useEffect(() => {
    dashboardApi.getCalendar()
      .then(setCalendarData)
      .catch(() => toast.error('Failed to load calendar data'))
      .finally(() => setLoading(false))
  }, [])

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1))
  const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1))

  const handleDayClick = (day) => {
    const key = format(day, 'yyyy-MM-dd')
    const data = calendarData[key]
    if (data) {
      setSelectedDay(key)
      setSelectedData(data)
    }
  }

  // Calculate totals for the current month view
  const monthlyTotals = days
    .filter(d => isSameMonth(d, currentDate))
    .reduce((acc, day) => {
      const key = format(day, 'yyyy-MM-dd')
      const data = calendarData[key]
      if (data) {
        acc.income += data.income || 0
        acc.expense += data.expense || 0
      }
      return acc
    }, { income: 0, expense: 0 })

  return (
    <div className="space-y-5">
      {/* Month summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-xs text-slate-400 mb-1">Month Income</p>
          <p className="font-display font-bold text-emerald-600">{formatCurrency(monthlyTotals.income)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-slate-400 mb-1">Month Expense</p>
          <p className="font-display font-bold text-red-500">{formatCurrency(monthlyTotals.expense)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-slate-400 mb-1">Net</p>
          <p className={`font-display font-bold ${monthlyTotals.income - monthlyTotals.expense >= 0 ? 'text-brand-600' : 'text-red-500'}`}>
            {formatCurrency(monthlyTotals.income - monthlyTotals.expense)}
          </p>
        </div>
      </div>

      {/* Calendar */}
      <div className="card p-5">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="font-display font-bold text-slate-800 text-xl">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-2">
          {WEEKDAYS.map(day => (
            <div key={day} className="text-center text-xs font-bold text-slate-400 uppercase tracking-wide py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        {loading ? (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd')
              const data = calendarData[key]
              const inMonth = isSameMonth(day, currentDate)
              const today = isToday(day)
              const hasData = !!data
              const isSelected = selectedDay === key

              return (
                <div
                  key={key}
                  onClick={() => handleDayClick(day)}
                  className={`
                    min-h-[80px] p-1.5 rounded-xl border transition-all cursor-pointer
                    ${inMonth ? 'bg-white' : 'bg-slate-50'}
                    ${today ? 'border-brand-400 bg-brand-50' : 'border-transparent hover:border-slate-200'}
                    ${isSelected ? 'ring-2 ring-brand-400' : ''}
                    ${hasData && inMonth ? 'hover:shadow-md' : ''}
                  `}
                >
                  <div className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                    today
                      ? 'bg-brand-500 text-white'
                      : inMonth ? 'text-slate-700' : 'text-slate-300'
                  }`}>
                    {format(day, 'd')}
                  </div>

                  {hasData && inMonth && (
                    <div className="space-y-0.5">
                      {data.income > 0 && (
                        <div className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 rounded px-1 truncate">
                          +{formatCurrency(data.income)}
                        </div>
                      )}
                      {data.expense > 0 && (
                        <div className="text-[10px] font-semibold text-red-500 bg-red-50 rounded px-1 truncate">
                          -{formatCurrency(data.expense)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Day detail panel */}
      {selectedDay && selectedData && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-slate-800">
              {format(parseISO(selectedDay), 'EEEE, d MMMM yyyy')}
            </h3>
            <button onClick={() => { setSelectedDay(null); setSelectedData(null) }}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-4 mb-4">
            <div className="flex-1 bg-emerald-50 rounded-xl p-3 text-center">
              <p className="text-xs text-emerald-600 font-semibold">Income</p>
              <p className="font-display font-bold text-emerald-700">{formatCurrency(selectedData.income)}</p>
            </div>
            <div className="flex-1 bg-red-50 rounded-xl p-3 text-center">
              <p className="text-xs text-red-500 font-semibold">Expense</p>
              <p className="font-display font-bold text-red-600">{formatCurrency(selectedData.expense)}</p>
            </div>
          </div>

          {selectedData.transactions?.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Transactions</p>
              {selectedData.transactions.map((txn, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{txn.notes || txn.category}</p>
                    <p className="text-xs text-slate-400">{txn.category} · {txn.account}</p>
                  </div>
                  <span className={`font-mono font-semibold text-sm ${txn.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">No transactions for this day</p>
          )}
        </div>
      )}
    </div>
  )
}
