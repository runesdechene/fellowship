import { useState, useMemo } from 'react'
import { useEvents } from '@/hooks/use-events'
import { useFriendsParticipations } from '@/hooks/use-participations'
import { useAuth } from '@/lib/auth'
import { EventCard } from '@/components/events/EventCard'
import { HeroBanner } from '@/components/events/HeroBanner'
import { SlideRow } from '@/components/events/SlideRow'
import { PRIMARY_TAGS } from '@/lib/constants'
import { Search, Crosshair, AlertTriangle } from 'lucide-react'
import type { EventWithScore } from '@/types/database'
import './Explorer.css'

type TemporalFilter = 'semaine' | 'mois' | 'proche' | '30j' | '3mois' | '6-12mois' | null

export function ExplorerPage() {
  const { profile } = useAuth()
  const { events: allEvents, loading } = useEvents()
  const { participations: friendParticipations } = useFriendsParticipations()

  const [search, _setSearch] = useState('')
  // _setSearch will be connected to global SearchBar later
  void _setSearch
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [showProspection, setShowProspection] = useState(false)
  const [temporalFilter, setTemporalFilter] = useState<TemporalFilter>(null)

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
    } else if (temporalFilter === '30j') {
      result = result.filter(ev =>
        ev.registration_deadline && daysUntil(ev.registration_deadline) > 0 && daysUntil(ev.registration_deadline) <= 30
      )
    } else if (temporalFilter === '3mois') {
      result = result.filter(ev =>
        ev.registration_deadline && daysUntil(ev.registration_deadline) > 0 && daysUntil(ev.registration_deadline) <= 90
      )
    } else if (temporalFilter === '6-12mois') {
      result = result.filter(ev =>
        ev.registration_deadline && daysUntil(ev.registration_deadline) >= 180 && daysUntil(ev.registration_deadline) <= 365
      )
    }

    // Sort by start_date ascending
    return [...result].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEvents, search, selectedTags, showProspection, temporalFilter])

  // ---------- hero event ----------
  const heroEvent = useMemo(() =>
    filteredEvents.find(ev => ev.image_url && new Date(ev.start_date) >= now),
  [filteredEvents, now])

  // ---------- friend event IDs ----------
  const friendEventIds = useMemo(() => {
    const ids = new Set<string>()
    for (const p of friendParticipations) ids.add(p.event_id)
    return ids
  }, [friendParticipations])

  // ---------- section builders (normal mode) ----------
  const nearbyEvents = useMemo(() =>
    profile?.department ? filteredEvents.filter(ev => ev.department === profile.department) : [],
  [filteredEvents, profile?.department])

  const tagSections = useMemo(() => {
    const sections: { tag: string; label: string; events: EventWithScore[] }[] = []
    for (const t of PRIMARY_TAGS) {
      const evs = filteredEvents.filter(ev => ev.primary_tag === t.value)
      if (evs.length > 0) sections.push({ tag: t.value, label: t.label, events: evs })
    }
    return sections
  }, [filteredEvents])

  const friendEvents = useMemo(() =>
    filteredEvents.filter(ev => friendEventIds.has(ev.id)),
  [filteredEvents, friendEventIds])

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
    : nearbyEvents.length > 0 || tagSections.length > 0 || friendEvents.length > 0 || recentEvents.length > 0

  const showEmpty = !loading && filteredEvents.length === 0

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
        {PRIMARY_TAGS.map(tag => (
          <button
            key={tag.value}
            onClick={() => toggleTag(tag.value)}
            className={`explorer-filter-chip ${selectedTags.has(tag.value) ? 'active' : ''}`}
          >
            {tag.label}
          </button>
        ))}

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
        ) : (
          <>
            <button
              onClick={() => setTemporalFilter(temporalFilter === '30j' ? null : '30j')}
              className={`explorer-filter-chip urgent ${temporalFilter === '30j' ? 'active' : ''}`}
            >
              &lt; 30 jours
            </button>
            <button
              onClick={() => setTemporalFilter(temporalFilter === '3mois' ? null : '3mois')}
              className={`explorer-filter-chip warning ${temporalFilter === '3mois' ? 'active' : ''}`}
            >
              &lt; 3 mois
            </button>
            <button
              onClick={() => setTemporalFilter(temporalFilter === '6-12mois' ? null : '6-12mois')}
              className={`explorer-filter-chip ${temporalFilter === '6-12mois' ? 'active' : ''}`}
            >
              6-12 mois
            </button>
          </>
        )}

        <div className="explorer-filter-divider" />

        <button
          onClick={() => setTemporalFilter(temporalFilter === 'proche' ? null : 'proche')}
          className={`explorer-filter-chip ${temporalFilter === 'proche' ? 'active' : ''}`}
        >
          Près de moi
        </button>
      </div>

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

      {/* Empty state */}
      {showEmpty && (
        <div className="explorer-empty">
          <Search strokeWidth={1.5} />
          <div className="explorer-empty-title">Aucun événement</div>
          <div className="explorer-empty-text">
            {search
              ? `Aucun résultat pour "${search}"`
              : 'Aucun événement trouvé avec ces filtres'}
          </div>
        </div>
      )}

      {/* Content */}
      {!loading && hasSections && (
        <>
          {/* Hero banner */}
          {heroEvent && <HeroBanner event={heroEvent} />}

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
              {nearbyEvents.length > 0 && (
                <SlideRow title="À venir près de toi" count={nearbyEvents.length}>
                  {nearbyEvents.map(renderCard)}
                </SlideRow>
              )}

              {tagSections.map(section => (
                <SlideRow key={section.tag} title={section.label} count={section.events.length}>
                  {section.events.map(renderCard)}
                </SlideRow>
              ))}

              {friendEvents.length > 0 && (
                <SlideRow title="Tes amis y vont" count={friendEvents.length}>
                  {friendEvents.map(renderCard)}
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
