import { useState, useMemo, useRef, useCallback } from 'react'
import { useMyParticipations } from '@/hooks/use-participations'
import { useCalendarYear } from '@/hooks/use-calendar'
import { CalendarMonth } from '@/components/calendar/CalendarMonth'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function CalendarPage() {
  const now = new Date()
  const defaultStart = now.getMonth()
  const defaultYear = now.getFullYear()

  const [year, setYear] = useState(defaultYear)
  const [animating, setAnimating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const { participations, loading } = useMyParticipations(year)
  const months = useCalendarYear(participations, year)

  // Prefetch adjacent years
  const { participations: partsPrev } = useMyParticipations(year - 1)
  const { participations: partsNext } = useMyParticipations(year + 1)
  const monthsPrev = useCalendarYear(partsPrev, year - 1)
  const monthsNext = useCalendarYear(partsNext, year + 1)

  // Sliding 12 months starting from defaultStart month
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

    // Phase 1: fade out + slide current content
    el.style.transition = 'opacity 0.2s ease, transform 0.2s ease'
    el.style.opacity = '0'
    el.style.transform = slideOut

    setTimeout(() => {
      // Phase 2: update data
      setYear(y => dir === 'next' ? y + 1 : y - 1)

      // Position new content off-screen
      el.style.transition = 'none'
      el.style.transform = slideIn

      // Phase 3: slide in after a frame
      requestAnimationFrame(() => {
        el.style.transition = 'opacity 0.3s ease, transform 0.3s ease'
        el.style.opacity = '1'
        el.style.transform = 'translateX(0)'

        setTimeout(() => setAnimating(false), 300)
      })
    }, 200)
  }, [animating])

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendrier</h1>
          <p className="text-sm text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
            {firstMonth?.label} {firstMonth?.year} — {lastMonth?.label} {lastMonth?.year}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate('prev')}
            disabled={animating}
            className="rounded-full p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          {year !== defaultYear && (
            <button
              onClick={() => {
                if (animating) return
                const dir = year > defaultYear ? 'prev' : 'next'
                navigate(dir)
                // For simplicity, just jump directly
                setTimeout(() => setYear(defaultYear), 250)
              }}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Aujourd'hui
            </button>
          )}
          <button
            onClick={() => navigate('next')}
            disabled={animating}
            className="rounded-full p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="space-y-3 rounded-2xl bg-muted/40 p-4">
              <div className="h-6 w-32 mx-auto animate-pulse rounded-full bg-muted" />
              <div className="h-24 animate-pulse rounded-xl bg-muted" />
            </div>
          ))}
        </div>
      ) : (
        <div
          ref={containerRef}
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
          style={{ willChange: 'opacity, transform' }}
        >
          {slidingMonths.map(month => (
            <div
              key={`${month.year}-${month.month}`}
              className="rounded-2xl bg-muted/40 p-4"
            >
              <CalendarMonth data={month} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
