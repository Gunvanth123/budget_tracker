import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const ALL_MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

export default function MonthYearPicker({ value, onChange, months = [], placeholder = 'Select Month...' }) {
  const [isOpen, setIsOpen] = useState(false)
  
  // Parse incoming value "YYYY-MM"
  const getInitialValues = () => {
    if (value && value.includes('-')) {
      const parts = value.split('-')
      return { month: parts[1], year: parseInt(parts[0], 10) }
    }
    const today = new Date()
    return {
      month: String(today.getMonth() + 1).padStart(2, '0'),
      year: today.getFullYear()
    }
  }

  const initial = getInitialValues()
  const [tempMonth, setTempMonth] = useState(initial.month)
  const [tempYear, setTempYear] = useState(initial.year)

  // Sync state when props change or modal opens
  useEffect(() => {
    const current = getInitialValues()
    setTempMonth(current.month)
    setTempYear(current.year)
  }, [value, isOpen])

  // Extract available years from parent's months array
  const currentYear = new Date().getFullYear()
  const defaultYears = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i) // 2023 - 2029
  const yearsList = months && months.length > 0
    ? [...new Set(months.map(m => parseInt(m.split('-')[0], 10)))].sort((a, b) => a - b)
    : defaultYears

  // Refs for scrolling and elements
  const monthsScrollRef = useRef(null)
  const yearsScrollRef = useRef(null)
  const monthRefs = useRef({})
  const yearRefs = useRef({})
  const monthScrollTimeout = useRef(null)
  const yearScrollTimeout = useRef(null)
  const isScrollingProgrammatically = useRef(false)

  const isMonthDisabled = (monthIndex, year = tempYear) => {
    if (!months || months.length === 0) return false
    const monthStr = String(monthIndex + 1).padStart(2, '0')
    const target = `${year}-${monthStr}`
    return !months.includes(target)
  }

  // Scroll helpers
  const scrollMonthToCenter = (monthIdx) => {
    const el = monthRefs.current[monthIdx]
    const container = monthsScrollRef.current
    if (el && container) {
      container.scrollTo({
        top: el.offsetTop - (container.clientHeight / 2) + (el.clientHeight / 2),
        behavior: 'smooth'
      })
    }
  }

  const scrollYearToCenter = (yearVal) => {
    const el = yearRefs.current[yearVal]
    const container = yearsScrollRef.current
    if (el && container) {
      container.scrollTo({
        top: el.offsetTop - (container.clientHeight / 2) + (el.clientHeight / 2),
        behavior: 'smooth'
      })
    }
  }

  // Initialize scroll positions when opened
  useEffect(() => {
    if (isOpen) {
      isScrollingProgrammatically.current = true
      setTimeout(() => {
        const mIdx = ALL_MONTHS.findIndex(m => m.value === tempMonth)
        if (mIdx !== -1) scrollMonthToCenter(mIdx)
        scrollYearToCenter(tempYear)
        
        setTimeout(() => {
          isScrollingProgrammatically.current = false
        }, 300)
      }, 100)
    }
  }, [isOpen])

  // If the tempMonth is disabled for the selected tempYear, find the first valid month for this year
  useEffect(() => {
    if (!isOpen) return
    const monthIndex = ALL_MONTHS.findIndex(m => m.value === tempMonth)
    if (isMonthDisabled(monthIndex, tempYear)) {
      const firstValidMonth = ALL_MONTHS.find((m, idx) => !isMonthDisabled(idx, tempYear))
      if (firstValidMonth) {
        isScrollingProgrammatically.current = true
        setTempMonth(firstValidMonth.value)
        const newIdx = ALL_MONTHS.indexOf(firstValidMonth)
        scrollMonthToCenter(newIdx)
        setTimeout(() => {
          isScrollingProgrammatically.current = false
        }, 300)
      }
    }
  }, [tempYear])

  const handleMonthClick = (val, idx) => {
    if (isMonthDisabled(idx, tempYear)) return
    isScrollingProgrammatically.current = true
    setTempMonth(val)
    scrollMonthToCenter(idx)
    setTimeout(() => {
      isScrollingProgrammatically.current = false
    }, 300)
  }

  const handleYearClick = (val) => {
    isScrollingProgrammatically.current = true
    setTempYear(val)
    scrollYearToCenter(val)
    setTimeout(() => {
      isScrollingProgrammatically.current = false
    }, 300)
  }

  // Handle scroll snap detection
  const handleScroll = (type) => {
    if (isScrollingProgrammatically.current) return
    const container = type === 'month' ? monthsScrollRef.current : yearsScrollRef.current
    if (!container) return

    if (type === 'month' && monthScrollTimeout.current) clearTimeout(monthScrollTimeout.current)
    if (type === 'year' && yearScrollTimeout.current) clearTimeout(yearScrollTimeout.current)

    const timeoutId = setTimeout(() => {
      const containerTop = container.scrollTop
      const containerHeight = container.clientHeight
      const centerPoint = containerTop + containerHeight / 2

      let closestItem = null
      let minDistance = Infinity

      if (type === 'month') {
        ALL_MONTHS.forEach((m, index) => {
          const el = monthRefs.current[index]
          if (el) {
            const itemCenter = el.offsetTop + el.clientHeight / 2
            const distance = Math.abs(centerPoint - itemCenter)
            if (distance < minDistance) {
              minDistance = distance
              closestItem = { item: m, index }
            }
          }
        })
        if (closestItem && !isMonthDisabled(closestItem.index, tempYear)) {
          setTempMonth(closestItem.item.value)
          // Keep it centered nicely
          scrollMonthToCenter(closestItem.index)
        }
      } else {
        yearsList.forEach((year) => {
          const el = yearRefs.current[year]
          if (el) {
            const itemCenter = el.offsetTop + el.clientHeight / 2
            const distance = Math.abs(centerPoint - itemCenter)
            if (distance < minDistance) {
              minDistance = distance
              closestItem = year
            }
          }
        })
        if (closestItem) {
          setTempYear(closestItem)
          scrollYearToCenter(closestItem)
        }
      }
    }, 150)

    if (type === 'month') monthScrollTimeout.current = timeoutId
    else yearScrollTimeout.current = timeoutId
  }

  // Formatting display value
  const formatLabel = () => {
    if (!value) return placeholder
    const parts = value.split('-')
    const monthName = MONTH_NAMES[parseInt(parts[1], 10) - 1]
    return `${monthName} ${parts[0]}`
  }

  const handleApply = () => {
    onChange(`${tempYear}-${tempMonth}`)
    setIsOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-between gap-2.5 py-2 px-4 text-[11px] sm:text-xs font-bold rounded-2xl border transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] focus:outline-none shrink-0"
        style={{
          background: 'var(--card)',
          borderColor: 'var(--border)',
          color: value ? 'var(--primary)' : 'var(--text-muted)',
          height: '38px'
        }}
      >
        <span className="truncate">{formatLabel()}</span>
        <CalendarIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <ChevronDown className="w-3 h-3 text-[var(--text-muted)] opacity-60 shrink-0" />
      </button>

      {isOpen && createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop — highest z-index so it sits above everything */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 9999 }}
                onClick={() => setIsOpen(false)}
              />

              {/* Centering wrapper — full screen flex, no transform conflict */}
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 10000,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                  pointerEvents: 'none'
                }}
              >
                {/* Modal Card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.88, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.88, y: 20 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 360 }}
                  style={{
                    pointerEvents: 'auto',
                    width: '100%',
                    maxWidth: '420px',
                    background: 'var(--card)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid var(--border)',
                    borderRadius: '28px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)'
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <style>{`
                    .mypicker-scroll::-webkit-scrollbar { display: none; }
                    .mypicker-scroll { -ms-overflow-style: none; scrollbar-width: none; }
                  `}</style>

                  {/* Headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', textAlign: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ position: 'relative', paddingBottom: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text)' }}>Select Month</span>
                      <div style={{ position: 'absolute', bottom: 0, width: '32px', height: '3px', background: 'rgb(99,102,241)', borderRadius: '9999px' }} />
                    </div>
                    <div style={{ position: 'relative', paddingBottom: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text)' }}>Select Year</span>
                      <div style={{ position: 'absolute', bottom: 0, width: '32px', height: '3px', background: 'rgb(99,102,241)', borderRadius: '9999px' }} />
                    </div>
                  </div>

                  {/* Selection wheels */}
                  <div style={{ position: 'relative', display: 'flex', gap: '16px', height: '200px', overflow: 'hidden' }}>
                    {/* Highlight lens */}
                    <div style={{ position: 'absolute', top: '80px', left: 0, right: 0, height: '40px', background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '12px', pointerEvents: 'none', zIndex: 10 }} />

                    {/* Months column */}
                    <div
                      ref={monthsScrollRef}
                      onScroll={() => handleScroll('month')}
                      className="mypicker-scroll"
                      style={{ flex: 1, overflowY: 'auto', scrollSnapType: 'y mandatory', height: '100%', paddingTop: '80px', paddingBottom: '80px' }}
                    >
                      {ALL_MONTHS.map((m, idx) => {
                        const isSelected = tempMonth === m.value
                        const isDisabled = isMonthDisabled(idx, tempYear)
                        return (
                          <div
                            key={m.value}
                            ref={el => monthRefs.current[idx] = el}
                            onClick={() => handleMonthClick(m.value, idx)}
                            style={{
                              height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              scrollSnapAlign: 'center', userSelect: 'none', fontSize: '14px',
                              fontWeight: isSelected ? 800 : 500,
                              color: isSelected ? 'var(--primary)' : 'var(--text)',
                              opacity: isDisabled ? 0.18 : isSelected ? 1 : 0.72,
                              transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                              transition: 'all 0.2s',
                              cursor: isDisabled ? 'not-allowed' : 'pointer',
                              pointerEvents: isDisabled ? 'none' : 'auto'
                            }}
                          >
                            {m.label}
                          </div>
                        )
                      })}
                    </div>

                    {/* Divider */}
                    <div style={{ width: '1px', height: '100%', background: 'var(--text)', opacity: 0.1 }} />

                    {/* Years column */}
                    <div
                      ref={yearsScrollRef}
                      onScroll={() => handleScroll('year')}
                      className="mypicker-scroll"
                      style={{ flex: 1, overflowY: 'auto', scrollSnapType: 'y mandatory', height: '100%', paddingTop: '80px', paddingBottom: '80px' }}
                    >
                      {yearsList.map((year) => {
                        const isSelected = tempYear === year
                        return (
                          <div
                            key={year}
                            ref={el => yearRefs.current[year] = el}
                            onClick={() => handleYearClick(year)}
                            style={{
                              height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              scrollSnapAlign: 'center', cursor: 'pointer', userSelect: 'none', fontSize: '14px',
                              fontWeight: isSelected ? 800 : 500,
                              color: isSelected ? 'var(--primary)' : 'var(--text)',
                              opacity: isSelected ? 1 : 0.72,
                              transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                              transition: 'all 0.2s'
                            }}
                          >
                            {year}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button
                      onClick={() => setIsOpen(false)}
                      style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '8px 16px', borderRadius: '12px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleApply}
                      style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff', background: 'rgb(99,102,241)', padding: '10px 28px', borderRadius: '9999px', border: 'none', cursor: 'pointer', boxShadow: '0 8px 24px rgba(99,102,241,0.35)' }}
                    >
                      Apply
                    </button>
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
