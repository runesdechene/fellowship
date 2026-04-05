import { useState, useMemo, useRef, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { useMyParticipations, useFriendsParticipations } from '@/hooks/use-participations'
import { useCalendarYear, type CalendarEvent, type CalendarMonth as CalendarMonthType } from '@/hooks/use-calendar'
import { CalendarMonth } from '@/components/calendar/CalendarMonth'
import { ChevronLeft, ChevronRight, Users } from 'lucide-react'
import './Calendar.css'

export function CalendarPage() {
  const now = new Date()
  const defaultStart = now.getMonth()
  const defaultYear = now.getFullYear()

  const { profile } = useAuth()
  const [year, setYear] = useState(defaultYear)
  const [animating, setAnimating] = useState(false)
  const [showFriends, setShowFriends] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const { participations, loading } = useMyParticipations(year)
  const months = useCalendarYear(participations, year)

  const { participations: partsNext } = useMyParticipations(year + 1)
  const monthsNext = useCalendarYear(partsNext, year + 1)

  const { participations: friendActivity } = useFriendsParticipations()

  // Convert friend participations to CalendarEvents grouped by month
  const friendEventsByMonth = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    if (!showFriends) return map

    for (const fp of friendActivity) {
      const ev = fp.events as Record<string, unknown> | undefined
      if (!ev) continue

      const startDate = new Date(ev.start_date as string)
      const endDate = new Date(ev.end_date as string)
      const key = `${startDate.getFullYear()}-${startDate.getMonth()}`

      const calEvent: CalendarEvent = {
        id: fp.event_id,
        name: ev.name as string,
        startDate,
        endDate,
        primaryTag: (ev.primary_tag as string) ?? '',
        status: '',
        visibility: 'public',
        city: (ev.city as string) ?? '',
        department: (ev.department as string) ?? '',
        imageUrl: (ev.image_url as string | null) ?? null,
        isFriend: true,
        friendName: fp.profiles?.display_name ?? 'Un ami',
      }

      if (!map[key]) map[key] = []
      // Avoid duplicates (same event from multiple friends)
      if (!map[key].some(e => e.id === calEvent.id)) {
        map[key].push(calEvent)
      }
    }
    return map
  }, [friendActivity, showFriends])

  // Merge friend events into months
  const mergeWithFriends = useCallback((monthData: CalendarMonthType): CalendarMonthType => {
    if (!showFriends) return monthData
    const key = `${monthData.year}-${monthData.month}`
    const friendEvents = friendEventsByMonth[key] ?? []
    // Filter out events already in my participations
    const myEventIds = new Set(monthData.events.map(e => e.id))
    const newFriendEvents = friendEvents.filter(e => !myEventIds.has(e.id))
    if (newFriendEvents.length === 0) return monthData
    return {
      ...monthData,
      events: [...monthData.events, ...newFriendEvents].sort(
        (a, b) => a.startDate.getTime() - b.startDate.getTime()
      ),
    }
  }, [showFriends, friendEventsByMonth])

  const slidingMonths = useMemo(() => {
    const all = [...months.slice(defaultStart), ...monthsNext.slice(0, defaultStart)]
    return all.map(mergeWithFriends)
  }, [months, monthsNext, defaultStart, mergeWithFriends])

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
          <h1 className="page-title">
            Le Calendrier <span className="calendar-title-owner">de {profile?.brand_name ?? profile?.display_name ?? ''}</span>
          </h1>
          <p className="calendar-subtitle">
            {firstMonth?.label} {firstMonth?.year} — {lastMonth?.label} {lastMonth?.year}
          </p>
        </div>
        <div className="calendar-nav">
          {/* Friends toggle — iOS switch */}
          <button
            onClick={() => setShowFriends(!showFriends)}
            className={`calendar-friends-toggle ${showFriends ? 'active' : ''}`}
          >
            <span className="calendar-friends-label">
              <Users strokeWidth={1.5} />
              Amis
            </span>
            <div className="calendar-switch-track">
              <div className="calendar-switch-thumb" />
            </div>
          </button>

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
