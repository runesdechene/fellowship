import { useState, useMemo, useRef, useCallback } from 'react'
import { useMyParticipations, useFriendsParticipations } from '@/hooks/use-participations'
import { useCalendarYear } from '@/hooks/use-calendar'
import { CalendarMonth } from '@/components/calendar/CalendarMonth'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './Calendar.css'

export function CalendarPage() {
  const now = new Date()
  const defaultStart = now.getMonth()
  const defaultYear = now.getFullYear()

  const [year, setYear] = useState(defaultYear)
  const [animating, setAnimating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const { participations, loading } = useMyParticipations(year)
  const months = useCalendarYear(participations, year)

  const { participations: partsNext } = useMyParticipations(year + 1)
  const monthsNext = useCalendarYear(partsNext, year + 1)

  const { participations: friendActivity } = useFriendsParticipations()

  const slidingMonths = useMemo(() => {
    const all = [...months.slice(defaultStart), ...monthsNext.slice(0, defaultStart)]
    return all
  }, [months, monthsNext, defaultStart])

  const firstMonth = slidingMonths[0]
  const lastMonth = slidingMonths[11]

  const navigate = useCallback((dir: 'prev' | 'next') => {
    if (animating) return
    const el = containerRef.current
    if (!el) return

    setAnimating(true)
    const slideOut = dir === 'next' ? 'translateX(-40px)' : 'translateX(40px)'
    const slideIn = dir === 'next' ? 'translateX(40px)' : 'translateX(-40px)'

    el.style.transition = 'opacity 0.2s ease, transform 0.2s ease'
    el.style.opacity = '0'
    el.style.transform = slideOut

    setTimeout(() => {
      setYear(y => dir === 'next' ? y + 1 : y - 1)
      el.style.transition = 'none'
      el.style.transform = slideIn

      requestAnimationFrame(() => {
        el.style.transition = 'opacity 0.3s ease, transform 0.3s ease'
        el.style.opacity = '1'
        el.style.transform = 'translateX(0)'
        setTimeout(() => setAnimating(false), 300)
      })
    }, 200)
  }, [animating])

  return (
    <div className="calendar-page">
      {/* Header */}
      <div className="calendar-header">
        <div>
          <h1 className="calendar-title">Calendrier</h1>
          <p className="calendar-subtitle">
            {firstMonth?.label} {firstMonth?.year} — {lastMonth?.label} {lastMonth?.year}
          </p>
        </div>
        <div className="calendar-nav">
          <button
            onClick={() => navigate('prev')}
            disabled={animating}
            className="calendar-nav-btn"
          >
            <ChevronLeft strokeWidth={1.5} />
          </button>
          {year !== defaultYear && (
            <button
              onClick={() => {
                if (animating) return
                const dir = year > defaultYear ? 'prev' : 'next'
                navigate(dir)
                setTimeout(() => setYear(defaultYear), 250)
              }}
              className="calendar-today-btn"
            >
              Aujourd'hui
            </button>
          )}
          <button
            onClick={() => navigate('next')}
            disabled={animating}
            className="calendar-nav-btn"
          >
            <ChevronRight strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="calendar-grid">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="calendar-skeleton-month">
              <div className="calendar-skeleton-title" />
              <div className="calendar-skeleton-event" />
            </div>
          ))}
        </div>
      ) : (
        <div
          ref={containerRef}
          className="calendar-grid"
          style={{ willChange: 'opacity, transform' }}
        >
          {slidingMonths.map(month => {
            const isCurrentMonth = month.year === now.getFullYear() && month.month === now.getMonth()
            const isEmpty = month.events.length === 0

            return (
              <div
                key={`${month.year}-${month.month}`}
                className={`calendar-month-card ${isCurrentMonth ? 'current' : ''} ${isEmpty ? 'empty' : ''}`}
              >
                <CalendarMonth data={month} friendParticipations={friendActivity} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
