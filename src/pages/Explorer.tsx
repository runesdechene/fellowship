import { useState, useMemo } from 'react'
import { useEvents } from '@/hooks/use-events'
import { useAuth } from '@/lib/auth'
import { EventCard } from '@/components/events/EventCard'
import { SlideRow } from '@/components/events/SlideRow'
import { PRIMARY_TAGS, getTagColor } from '@/lib/constants'
import { Crosshair, AlertTriangle, Plus } from 'lucide-react'
import type { EventWithScore } from '@/types/database'
import './Explorer.css'

import { Calendar as CalendarIcon } from 'lucide-react'

type TemporalFilter = 'semaine' | 'mois' | 'proche' | null

export function ExplorerPage() {
  const { profile } = useAuth()
  const { events: allEvents, loading } = useEvents()

  const [search, _setSearch] = useState('')
  // _setSearch will be connected to global SearchBar later
  void _setSearch
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [showProspection, setShowProspection] = useState(false)
  const [temporalFilter, setTemporalFilter] = useState<TemporalFilter>(null)
  // Month pickers for prospection (0 = current month)
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const monthOptions = Array.from({ length: 13 }, (_, i) => {
    const d = new Date(currentYear, currentMonth + i)
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    }
  })
  const [monthFrom, setMonthFrom] = useState(monthOptions[0].value)
  const [monthTo, setMonthTo] = useState(monthOptions[12].value)

  const isExposant = profile?.type === 'exposant'

  const now = useMemo(() => new Date(), [])

  // ---------- helpers ----------
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  const daysUntil = (dateStr: string) =>
    Math.ceil((new Date(dateStr).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  const isThisWeek = (dateStr: string) => daysUntil(dateStr) >= 0 && daysUntil(dateStr) <= 7
  const isThisMonth = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d >= now
  }
  const matchesDepartment = (ev: EventWithScore) =>
    profile?.department ? ev.department === profile.department : false

  // ---------- filtered events ----------
  const filteredEvents = useMemo(() => {
    let result = allEvents

    // Search filter
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(ev => ev.name.toLowerCase().includes(q))
    }

    // Tag filter
    if (selectedTags.size > 0) {
      result = result.filter(ev => selectedTags.has(ev.primary_tag))
    }

    // Prospection mode: hide past registration deadlines
    if (showProspection) {
      result = result.filter(ev =>
        !ev.registration_deadline || new Date(ev.registration_deadline) > now
      )
    }

    // Temporal filters
    if (temporalFilter === 'semaine') {
      result = result.filter(ev => isThisWeek(ev.start_date))
    } else if (temporalFilter === 'mois') {
      result = result.filter(ev => isThisMonth(ev.start_date))
    } else if (temporalFilter === 'proche') {
      result = result.filter(ev => matchesDepartment(ev))
    }

    // Prospection month range filter
    if (showProspection) {
      const fromDate = new Date(monthFrom + '-01')
      const toDate = new Date(monthTo + '-01')
      toDate.setMonth(toDate.getMonth() + 1) // end of the "to" month
      result = result.filter(ev => {
        const d = new Date(ev.start_date)
        return d >= fromDate && d < toDate
      })
    }

    // Sort by start_date ascending
    return [...result].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEvents, search, selectedTags, showProspection, temporalFilter, monthFrom, monthTo])


  // ---------- section builders (normal mode) — 3 fixed sections ----------
  const nearbyEvents = useMemo(() =>
    profile?.department ? filteredEvents.filter(ev => ev.department === profile.department && new Date(ev.start_date) >= now) : [],
  [filteredEvents, profile?.department, now])

  const upcomingEvents = useMemo(() =>
    filteredEvents.filter(ev => new Date(ev.start_date) >= now),
  [filteredEvents, now])

  const recentEvents = useMemo(() =>
    [...filteredEvents].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
  [filteredEvents])

  // ---------- section builders (prospection mode) ----------
  const urgentEvents = useMemo(() =>
    filteredEvents.filter(ev =>
      ev.registration_deadline && daysUntil(ev.registration_deadline) > 0 && daysUntil(ev.registration_deadline) <= 30
    ),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [filteredEvents])

  const openRegistrationEvents = useMemo(() =>
    filteredEvents.filter(ev =>
      !ev.registration_deadline ||
      (ev.registration_deadline && daysUntil(ev.registration_deadline) > 30)
    ),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [filteredEvents])

  // ---------- render card ----------
  const renderCard = (ev: EventWithScore) => (
    <div key={ev.id} className="flex-shrink-0 w-[200px]">
      <EventCard event={ev} prospection={showProspection} />
    </div>
  )

  // ---------- any sections to show? ----------
  const hasSections = showProspection
    ? urgentEvents.length > 0 || openRegistrationEvents.length > 0
    : true // département section is always visible


  return (
    <div className="explorer-page">
      {/* Mode bar */}
      <div className="explorer-mode-bar">
        <h1 className="explorer-title">Explorer</h1>
        {isExposant && (
          <button
            onClick={() => {
              setShowProspection(!showProspection)
              setTemporalFilter(null)
            }}
            className={`explorer-prospection-toggle ${showProspection ? 'active' : ''}`}
          >
            <span className="explorer-prospection-label">
              <Crosshair strokeWidth={1.5} />
              Prospection
            </span>
            <div className="explorer-switch-track">
              <div className="explorer-switch-thumb" />
            </div>
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="explorer-filters">
        {PRIMARY_TAGS.map(tag => {
          const colors = getTagColor(tag.value)
          const isActive = selectedTags.has(tag.value)
          return (
            <button
              key={tag.value}
              onClick={() => toggleTag(tag.value)}
              className="explorer-filter-chip"
              style={isActive
                ? { background: colors.color, color: 'white' }
                : { background: colors.bg, color: colors.color }
              }
            >
              {tag.label}
            </button>
          )
        })}

        <div className="explorer-filter-divider" />

        {!showProspection ? (
          <>
            <button
              onClick={() => setTemporalFilter(temporalFilter === 'semaine' ? null : 'semaine')}
              className={`explorer-filter-chip ${temporalFilter === 'semaine' ? 'active' : ''}`}
            >
              Cette semaine
            </button>
            <button
              onClick={() => setTemporalFilter(temporalFilter === 'mois' ? null : 'mois')}
              className={`explorer-filter-chip ${temporalFilter === 'mois' ? 'active' : ''}`}
            >
              Ce mois
            </button>
          </>
        ) : null}

        <div className="explorer-filter-divider" />

        <button
          onClick={() => setTemporalFilter(temporalFilter === 'proche' ? null : 'proche')}
          className={`explorer-filter-chip ${temporalFilter === 'proche' ? 'active' : ''}`}
        >
          Près de moi
        </button>
      </div>

      {/* Prospection month pickers */}
      {showProspection && (
        <div className="explorer-month-pickers">
          <CalendarIcon strokeWidth={1.5} className="explorer-month-pickers-icon" />
          <span className="explorer-month-pickers-label">De</span>
          <select
            value={monthFrom}
            onChange={e => setMonthFrom(e.target.value)}
            className="explorer-month-select"
          >
            {monthOptions.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <span className="explorer-month-pickers-label">à</span>
          <select
            value={monthTo}
            onChange={e => setMonthTo(e.target.value)}
            className="explorer-month-select"
          >
            {monthOptions.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Prospection alert */}
      {showProspection && urgentEvents.length > 0 && (
        <div className="explorer-alert">
          <div className="explorer-alert-icon">
            <AlertTriangle strokeWidth={2} />
          </div>
          <span className="explorer-alert-text">
            Inscriptions bientôt fermées
          </span>
          <span className="explorer-alert-count">{urgentEvents.length}</span>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ padding: '0 24px' }}>
          <div className="h-[300px] rounded-2xl bg-card animate-pulse mb-6" />
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex-shrink-0 w-[200px] rounded-2xl bg-card animate-pulse" style={{ aspectRatio: '2/3' }} />
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {!loading && hasSections && (
        <>
          {/* Hero banner */}

          {showProspection ? (
            <>
              {urgentEvents.length > 0 && (
                <SlideRow
                  title="🔥 Inscriptions bientôt fermées"
                  titleStyle={{ color: 'hsl(0 65% 50%)' }}
                  count={urgentEvents.length}
                >
                  {urgentEvents.map(renderCard)}
                </SlideRow>
              )}
              {openRegistrationEvents.length > 0 && (
                <SlideRow
                  title="Inscription ouverte"
                  count={openRegistrationEvents.length}
                >
                  {openRegistrationEvents.map(renderCard)}
                </SlideRow>
              )}
            </>
          ) : (
            <>
              <SlideRow
                title={profile?.department ? `Dans votre département (${profile.department})` : 'Dans votre département'}
                count={nearbyEvents.length}
              >
                {nearbyEvents.map(renderCard)}
                <div key="add-card" className="flex-shrink-0 w-[200px]">
                  <button
                    onClick={() => {
                      const fab = document.querySelector('.fab-button') as HTMLButtonElement
                      fab?.click()
                    }}
                    className="explorer-add-card"
                  >
                    <div className="explorer-add-card-icon">
                      <Plus strokeWidth={1.5} />
                    </div>
                    <span className="explorer-add-card-text">Ajouter un événement</span>
                  </button>
                </div>
              </SlideRow>

              {upcomingEvents.length > 0 && (
                <SlideRow title="Bientôt" count={upcomingEvents.length}>
                  {upcomingEvents.map(renderCard)}
                </SlideRow>
              )}

              {recentEvents.length > 0 && (
                <SlideRow title="Ajoutés récemment" count={recentEvents.length}>
                  {recentEvents.map(renderCard)}
                </SlideRow>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
