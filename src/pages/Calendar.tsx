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

  useAuth() // ensure authenticated
  const [year, setYear] = useState(defaultYear)
  const [animating, setAnimating] = useState(false)
  const [showMine, setShowMine] = useState(() => localStorage.getItem('fellowship-calendar-mine') !== 'false')
  const [showPro, setShowPro] = useState(() => localStorage.getItem('fellowship-calendar-pro') === 'true')
  const [showVisiteurs, setShowVisiteurs] = useState(() => localStorage.getItem('fellowship-calendar-visiteurs') === 'true')
  const containerRef = useRef<HTMLDivElement>(null)

  const { participations, loading } = useMyParticipations(year)
  const months = useCalendarYear(participations, year)

  const { participations: partsNext } = useMyParticipations(year + 1)
  const monthsNext = useCalendarYear(partsNext, year + 1)

  const { participations: friendActivity } = useFriendsParticipations()

  // Convert friend participations to CalendarEvents grouped by month
  const friendEventsByMonth = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    if (!showPro && !showVisiteurs) return map

    for (const fp of friendActivity) {
      const ev = fp.events as Record<string, unknown> | undefined
      if (!ev) continue

      // Filter by friend type
      const friendType = fp.profiles?.type
      if (friendType === 'exposant' && !showPro) continue
      if (friendType === 'public' && !showVisiteurs) continue

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
      // If same event from multiple friends, append name
      const existing = map[key].find(e => e.id === calEvent.id)
      if (existing) {
        const newName = fp.profiles?.display_name ?? 'Un ami'
        if (existing.friendName && !existing.friendName.includes(newName)) {
          existing.friendName += `, ${newName}`
        }
      } else {
        map[key].push(calEvent)
      }
    }
    return map
  }, [friendActivity, showPro, showVisiteurs])

  // Merge friend events into months + filter own events
  const mergeWithFriends = useCallback((monthData: CalendarMonthType): CalendarMonthType => {
    let events = showMine ? monthData.events : []

    if (showPro || showVisiteurs) {
      const key = `${monthData.year}-${monthData.month}`
      const friendEvents = friendEventsByMonth[key] ?? []
      // Only deduplicate if showing own events too
      const existingIds = showMine ? new Set(events.map(e => e.id)) : new Set<string>()
      const newFriendEvents = friendEvents.filter(e => !existingIds.has(e.id))
      events = [...events, ...newFriendEvents]
    }

    events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

    return { ...monthData, events }
  }, [showMine, showPro, showVisiteurs, friendEventsByMonth])

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
          <h1 className="page-title">Calendrier</h1>
          <p className="calendar-subtitle">
            {firstMonth?.label} {firstMonth?.year} — {lastMonth?.label} {lastMonth?.year}
          </p>
        </div>

        {/* Year navigation */}
        <div className="calendar-year-nav">
          <button
            onClick={() => navigate('prev')}
            disabled={animating}
            className="calendar-nav-btn"
          >
            <ChevronLeft strokeWidth={1.5} />
          </button>
          <span className="calendar-year-label">{year}</span>
          <button
            onClick={() => navigate('next')}
            disabled={animating}
            className="calendar-nav-btn"
          >
            <ChevronRight strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="calendar-filters">
        <button
          onClick={() => { const next = !showMine; setShowMine(next); localStorage.setItem('fellowship-calendar-mine', String(next)) }}
          className={`calendar-filter-btn ${showMine ? 'active' : ''}`}
        >
          Mes événements
        </button>
        <button
          onClick={() => { const next = !showPro; setShowPro(next); localStorage.setItem('fellowship-calendar-pro', String(next)) }}
          className={`calendar-filter-btn ${showPro ? 'active' : ''}`}
        >
          <Users strokeWidth={1.5} />
          Amis pro
        </button>
        <button
          onClick={() => { const next = !showVisiteurs; setShowVisiteurs(next); localStorage.setItem('fellowship-calendar-visiteurs', String(next)) }}
          className={`calendar-filter-btn ${showVisiteurs ? 'active' : ''}`}
        >
          <Users strokeWidth={1.5} />
          Amis visiteurs
        </button>
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
