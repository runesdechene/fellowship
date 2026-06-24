import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useMyParticipations, useFriendsParticipations } from '@/hooks/use-participations'
import { useCalendarYear, type CalendarEvent, type CalendarMonth as CalendarMonthType } from '@/hooks/use-calendar'
import { CalendarMonth } from '@/components/calendar/CalendarMonth'
import { CalendarFriendsModal } from '@/components/calendar/CalendarFriendsModal'
import { MobileAgenda } from '@/components/calendar/MobileAgenda'
import { planForActor } from '@/lib/navModel'
import { useDateQuota } from '@/hooks/use-date-quota'
import { seasonSummary } from '@/lib/calendar-season'
import { ChevronLeft, ChevronRight, Users, Lock } from 'lucide-react'
import './Calendar.css'

export function CalendarPage() {
  const now = new Date()
  const defaultStart = now.getMonth()
  const defaultYear = now.getFullYear()

  // Le calendrier suit l'acteur ACTIF (entité ou personne), pas le type compte legacy
  // (`profile.type`) qui ratait l'edge case d'un festivalier ayant aussi une entité.
  const { currentActor, currentActorRow } = useAuth()
  const routerNav = useNavigate()
  const isFree = planForActor(currentActor, currentActorRow) !== 'pro'
  const quota = useDateQuota()
  const actorKind: 'entity' | 'person' = currentActor?.kind === 'entity' ? 'entity' : 'person'
  const [year, setYear] = useState(defaultYear)
  const [animating, setAnimating] = useState(false)
  const [showMine, setShowMine] = useState(() => localStorage.getItem('fellowship-calendar-mine') !== 'false')
  const [showPro, setShowPro] = useState(() => localStorage.getItem('fellowship-calendar-pro') === 'true')
  const [showVisiteurs, setShowVisiteurs] = useState(() => localStorage.getItem('fellowship-calendar-visiteurs') === 'true')
  // Le gratuit ne peut pas activer l'overlay réseau (Pro) : valeurs effectives forcées à false.
  const effShowPro = !isFree && showPro
  const effShowVisiteurs = !isFree && showVisiteurs
  const containerRef = useRef<HTMLDivElement>(null)
  const [modalEvent, setModalEvent] = useState<{ id: string; name: string } | null>(null)

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const { participations, loading } = useMyParticipations(year)
  const months = useCalendarYear(participations, year)

  const { participations: partsNext } = useMyParticipations(year + 1)
  const monthsNext = useCalendarYear(partsNext, year + 1)

  const { participations: friendActivity } = useFriendsParticipations()

  // Convert friend participations to CalendarEvents grouped by month
  const friendEventsByMonth = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    if (!effShowPro && !effShowVisiteurs) return map

    for (const fp of friendActivity) {
      const ev = fp.events as Record<string, unknown> | undefined
      if (!ev) continue

      // Filter by friend type
      const friendKind = fp.actor_public?.kind
      if (friendKind === 'entity' && !effShowPro) continue
      if (friendKind === 'person' && !effShowVisiteurs) continue

      const startDate = new Date(ev.start_date as string)
      const endDate = new Date(ev.end_date as string)
      const key = `${startDate.getFullYear()}-${startDate.getMonth()}`

      const calEvent: CalendarEvent = {
        id: fp.event_id,
        name: ev.name as string,
        startDate,
        endDate,
        primaryTag: ((ev.tags as string[] | null)?.[0] as string) ?? 'autre',
        status: '',
        paymentStatus: null,
        visibility: 'public',
        city: (ev.city as string) ?? '',
        department: (ev.department as string) ?? '',
        imageUrl: (ev.image_url as string | null) ?? null,
        slug: (ev.slug as string | null) ?? null,
        isFriend: true,
        friendName: fp.actor_public?.label ?? 'Un ami',
        friendAvatarUrl: fp.actor_public?.avatar_url ?? null,
        friendSlug: fp.actor_public?.public_slug ?? fp.actor_id,
      }

      if (!map[key]) map[key] = []
      // If same event from multiple friends, append name
      const existing = map[key].find(e => e.id === calEvent.id)
      if (existing) {
        const newName = fp.actor_public?.label ?? 'Un ami'
        if (existing.friendName && !existing.friendName.includes(newName)) {
          existing.friendName += `, ${newName}`
        }
      } else {
        map[key].push(calEvent)
      }
    }
    return map
  }, [friendActivity, effShowPro, effShowVisiteurs])

  // Merge friend events into months + filter own events
  const mergeWithFriends = useCallback((monthData: CalendarMonthType): CalendarMonthType => {
    let events = showMine ? monthData.events : []

    if (effShowPro || effShowVisiteurs) {
      const key = `${monthData.year}-${monthData.month}`
      const friendEvents = friendEventsByMonth[key] ?? []
      // Only deduplicate if showing own events too
      const existingIds = showMine ? new Set(events.map(e => e.id)) : new Set<string>()
      const newFriendEvents = friendEvents.filter(e => !existingIds.has(e.id))
      events = [...events, ...newFriendEvents]
    }

    events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

    return { ...monthData, events }
  }, [showMine, effShowPro, effShowVisiteurs, friendEventsByMonth])

  /* eslint-disable react-hooks/preserve-manual-memoization -- React Compiler can't track defaultStart across renders; manual useMemo is required here */
  const slidingMonths = useMemo(() => {
    const all = [...months.slice(defaultStart), ...monthsNext.slice(0, defaultStart)]
    return all.map(mergeWithFriends)
  }, [months, monthsNext, defaultStart, mergeWithFriends])
  /* eslint-enable react-hooks/preserve-manual-memoization */

  const firstMonth = slidingMonths[0]
  const lastMonth = slidingMonths[11]
  const summary = seasonSummary(slidingMonths, now)

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
      {!loading && participations.length === 0 && partsNext.length === 0 && (
        <div className="calendar-empty-hint">
          Aucune date pour l'instant — <Link to="/explorer">Explorer les festivals</Link>
        </div>
      )}
      {/* En-tête + filtres : collants sur mobile via .calendar-topbar (neutre en desktop) */}
      <div className="calendar-topbar">
      {/* Header */}
      <div className="calendar-header">
        <div>
          <h1 className="page-title">Calendrier</h1>
          <p className="calendar-subtitle">
            {firstMonth?.label} {firstMonth?.year} — {lastMonth?.label} {lastMonth?.year}
          </p>
          {quota.isFreeEntity && (
            <Link to="/reglages" className={'calendar-quota' + (quota.atLimit ? ' at-limit' : '')}>
              <b>{quota.used} / {quota.limit}</b> dates · Pro = illimité
            </Link>
          )}
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

      {/* Ancre saison — point focal léger (pas un héros) */}
      <div className="calendar-anchor">
        <span className="calendar-anchor-big">{summary.total}</span>
        <div>
          <div className="eyebrow calendar-anchor-eyebrow">dates cette saison</div>
          {summary.next && (
            <div className="calendar-anchor-next">
              prochaine dans <strong>{summary.next.daysUntil === 0 ? "aujourd'hui" : `${summary.next.daysUntil} jour${summary.next.daysUntil > 1 ? 's' : ''}`}</strong>
              {summary.next.daysUntil !== 0 && ' — '}{summary.next.daysUntil !== 0 && summary.next.name}
            </div>
          )}
        </div>
      </div>

      {/* Teaser Pro — uniquement en free */}
      {isFree && (
        <Link to="/boutique" className="calendar-teaser">
          <div>
            <div className="calendar-teaser-title">Vois où vont tes amis et les festivaliers</div>
            <div className="calendar-teaser-sub">Tes dates restent gratuites. Le réseau « qui va où » est réservé au Pro.</div>
          </div>
          <span className="da-btn da-btn-flat da-btn-sm">Passer Pro</span>
        </Link>
      )}

      {/* Filters bar */}
      <div className="calendar-filters">
        <button
          onClick={() => { const next = !showMine; setShowMine(next); localStorage.setItem('fellowship-calendar-mine', String(next)) }}
          className={`calendar-filter-btn ${showMine ? 'active' : ''}`}
        >
          Mes dates
        </button>
        <button
          onClick={() => { if (isFree) { routerNav('/boutique'); return } const next = !showPro; setShowPro(next); localStorage.setItem('fellowship-calendar-pro', String(next)) }}
          className={`calendar-filter-btn ${effShowPro ? 'active' : ''} ${isFree ? 'locked' : ''}`}
        >
          {isFree ? <Lock strokeWidth={1.5} /> : <Users strokeWidth={1.5} />}
          Amis pro
        </button>
        <button
          onClick={() => { if (isFree) { routerNav('/boutique'); return } const next = !showVisiteurs; setShowVisiteurs(next); localStorage.setItem('fellowship-calendar-visiteurs', String(next)) }}
          className={`calendar-filter-btn ${effShowVisiteurs ? 'active' : ''} ${isFree ? 'locked' : ''}`}
        >
          {isFree ? <Lock strokeWidth={1.5} /> : <Users strokeWidth={1.5} />}
          Visiteurs
        </button>
      </div>
      </div>{/* /.calendar-topbar */}

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
                className={`glass-card calendar-month-card ${isCurrentMonth ? 'current' : ''} ${isEmpty ? 'empty' : ''}`}
                {...(isEmpty ? {
                  role: 'button', tabIndex: 0,
                  onClick: () => routerNav('/explorer', { state: { month: { year: month.year, month: month.month } } }),
                } : {})}
              >
                <CalendarMonth data={month} actorKind={actorKind} friendParticipations={friendActivity} onOpenFriends={(id, name) => setModalEvent({ id, name })} />
              </div>
            )
          })}
        </div>
      )}
      {/* Mobile calendar — agenda vertical */}
      {isMobile && (
        <div className="mobile-calendar">
          <MobileAgenda
            months={slidingMonths}
            actorKind={actorKind}
            friendParticipations={friendActivity}
            onOpenFriends={(id, name) => setModalEvent({ id, name })}
          />
        </div>
      )}
      {/* Friends modal — rendered at page level */}
      {modalEvent && (
        <CalendarFriendsModal
          eventName={modalEvent.name}
          friends={friendActivity.filter(f => f.event_id === modalEvent.id)}
          onClose={() => setModalEvent(null)}
        />
      )}
    </div>
  )
}
