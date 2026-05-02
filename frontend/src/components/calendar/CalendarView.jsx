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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card p-3 sm:p-4 text-center flex flex-row sm:flex-col items-center sm:justify-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Income</p>
          <p className="font-bold text-lg" style={{ color: '#22C55E' }}>{formatCurrency(monthlyTotals.income)}</p>
        </div>
        <div className="card p-3 sm:p-4 text-center flex flex-row sm:flex-col items-center sm:justify-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Expense</p>
          <p className="font-bold text-lg" style={{ color: '#EF4444' }}>{formatCurrency(monthlyTotals.expense)}</p>
        </div>
        <div className="card p-3 sm:p-4 text-center flex flex-row sm:flex-col items-center sm:justify-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Net</p>
          <p className="font-bold text-lg" style={{ color: monthlyTotals.income - monthlyTotals.expense >= 0 ? 'var(--primary)' : '#EF4444' }}>
            {formatCurrency(monthlyTotals.income - monthlyTotals.expense)}
          </p>
        </div>
      </div>

      {/* Calendar */}
      <div className="card p-5">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="font-bold text-xl" style={{ color: 'var(--text)' }}>
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-2">
          {WEEKDAYS.map(day => (
            <div key={day} className="text-center text-xs font-bold uppercase tracking-wide py-2" style={{ color: 'var(--text-muted)' }}>
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        {loading ? (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--border)' }} />
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
                  className={`min-h-[80px] p-1.5 rounded-xl border transition-all cursor-pointer relative group ${
                    isSelected ? 'ring-2' : ''
                  } ${hasData && inMonth ? 'hover:shadow-md' : ''}`}
                  style={{
                    background: today
                      ? 'rgba(0,161,155,0.1)'
                      : inMonth ? 'var(--card)' : 'var(--bg)',
                    borderColor: today
                      ? 'var(--primary)'
                      : isSelected ? 'var(--secondary)'
                      : 'var(--border)',
                    opacity: inMonth ? 1 : 0.45,
                    outline: isSelected ? '2px solid var(--primary)' : 'none',
                  }}
                >
                  {/* Floating Totals Popover (Mobile/iPad Focus) */}
                  {hasData && inMonth && isSelected && (
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-20 bg-[var(--card)] border border-[var(--border)] rounded-lg p-2 shadow-xl flex flex-col gap-1 min-w-[90px] animate-in fade-in zoom-in-95 duration-200 sm:hidden">
                       <div className="flex items-center justify-between gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                          <span className="text-[10px] font-bold text-[#22C55E]">{formatCurrency(data.income)}</span>
                       </div>
                       <div className="flex items-center justify-between gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                          <span className="text-[10px] font-bold text-[#EF4444]">{formatCurrency(data.expense)}</span>
                       </div>
                       {/* Arrow */}
                       <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[var(--card)] border-r border-b border-[var(--border)] rotate-45" />
                    </div>
                  )}

                  <div
                    className="text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1"
                    style={today
                      ? { background: 'var(--primary)', color: '#fff' }
                      : { color: inMonth ? 'var(--text)' : 'var(--text-muted)' }
                    }
                  >
                    {format(day, 'd')}
                  </div>

                  {hasData && inMonth && (
                    <div className="space-y-0.5">
                      {/* Desktop: Show amounts */}
                      <div className="hidden sm:block space-y-0.5">
                        {data.income > 0 && (
                          <div className="text-[10px] font-semibold rounded px-1 truncate" style={{ color: '#22C55E', background: 'rgba(34,197,94,0.12)' }}>
                            +{formatCurrency(data.income)}
                          </div>
                        )}
                        {data.expense > 0 && (
                          <div className="text-[10px] font-semibold rounded px-1 truncate" style={{ color: '#EF4444', background: 'rgba(239,68,68,0.12)' }}>
                            -{formatCurrency(data.expense)}
                          </div>
                        )}
                      </div>
                      
                      {/* Mobile: Show dots */}
                      <div className="flex sm:hidden justify-center gap-1 mt-1">
                        {data.income > 0 && <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#22C55E' }} />}
                        {data.expense > 0 && <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#EF4444' }} />}
                      </div>
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
            <h3 className="font-bold" style={{ color: 'var(--text)' }}>
              {format(parseISO(selectedDay), 'EEEE, d MMMM yyyy')}
            </h3>
            <button
              onClick={() => { setSelectedDay(null); setSelectedData(null) }}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-4 mb-4">
            <div className="flex-1 rounded-xl p-3 text-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
              <p className="text-xs font-semibold" style={{ color: '#22C55E' }}>Income</p>
              <p className="font-bold" style={{ color: '#22C55E' }}>{formatCurrency(selectedData.income)}</p>
            </div>
            <div className="flex-1 rounded-xl p-3 text-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
              <p className="text-xs font-semibold" style={{ color: '#EF4444' }}>Expense</p>
              <p className="font-bold" style={{ color: '#EF4444' }}>{formatCurrency(selectedData.expense)}</p>
            </div>
          </div>

          {selectedData.transactions?.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Transactions</p>
              {selectedData.transactions.map((txn, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: 'var(--border)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{txn.notes || txn.category}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{txn.category} · {txn.account}</p>
                  </div>
                  <span className="font-mono font-semibold text-sm" style={{ color: txn.type === 'income' ? '#22C55E' : '#EF4444' }}>
                    {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No transactions for this day</p>
          )}
        </div>
      )}
    </div>
  )
}
