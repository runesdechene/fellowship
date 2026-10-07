import { useState, useMemo, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { eventPath } from '@/lib/event-link'
import { useEvents } from '@/hooks/use-events'
import { useAuth } from '@/lib/auth'
import { useTags } from '@/hooks/use-tags'
import { useMyParticipations, addParticipation, removeParticipation } from '@/hooks/use-participations'
import { composeFilter, monthRangeFor, type Zone, type Period, type ActorKind, type GeoFilter } from '@/lib/explorer'
import type { AddressSelection } from '@/components/events/AddressAutocomplete'
import { uploadEventImage } from '@/lib/event-image'
import { supabase } from '@/lib/supabase'
import { planForActor } from '@/lib/navModel'
import { countActiveDates, canAddDate } from '@/lib/date-quota'
import { DateQuotaModal } from '@/components/mes-dates/DateQuotaModal'
import { EventGrid } from '@/components/explorer/EventGrid'
import { SearchSegments } from '@/components/explorer/SearchSegments'
import { useFriendsByEvent } from '@/hooks/use-friends-by-event'
import type { EventWithScore } from '@/types/database'
import './Explorer.css'

// ---------- Persist helpers ----------
function readStored(): Record<string, unknown> {
  try { return JSON.parse(localStorage.getItem('explorer-filters') ?? '{}') } catch { return {} }
}
function persistFilters(patch: Record<string, unknown>) {
  try {
    const cur = readStored()
    localStorage.setItem('explorer-filters', JSON.stringify({ ...cur, ...patch }))
  } catch { /* ignore */ }
}

// ---------- Grid Skeleton ----------
function GridSkeleton() {
  return (
    <div className="egrid-wrap">
      <div className="egrid">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="egrid-card egrid-skel" aria-hidden="true">
            <div className="egrid-img egrid-skel-img" />
            <div className="egrid-body">
              <div className="egrid-skel-line" style={{ width: '70%' }} />
              <div className="egrid-skel-line" style={{ width: '45%' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------- Empty state ----------
function ExplorerEmpty() {
  return (
    <div className="explorer-empty-coverflow">
      <div className="explorer-empty-icon">🎪</div>
      <div className="explorer-empty-title">Aucun festival ne correspond</div>
      <div className="explorer-empty-text">Élargis tes filtres pour découvrir plus de festivals.</div>
    </div>
  )
}

// ---------- Main component ----------
export function ExplorerPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { person, currentActor, currentActorRow, user, isAdmin } = useAuth()
  const { events: allEvents, loading, refetch: refetchEvents } = useEvents()
  const { tags: dynamicTags } = useTags()
  const { participations, refetch: refetchParticipations } = useMyParticipations()

  // ---------- Filters (persisted) ----------
  const stored = useMemo(() => readStored(), [])

  const [selectedTags, setSelectedTags] = useState<Set<string>>(
    () => new Set((stored.tags as string[] | undefined) ?? [])
  )
  const [zone, setZone] = useState<Zone>(
    () => (stored.zone === 'mine' || stored.zone === 'france') ? stored.zone as Zone : 'france'
  )
  // Filtre géo (localisation + rayon km) — prend le pas sur `zone` quand défini.
  const [geo, setGeo] = useState<GeoFilter | null>(() => {
    const g = stored.geo as GeoFilter | undefined
    return g && typeof g.lat === 'number' && typeof g.lng === 'number' && typeof g.radiusKm === 'number' ? g : null
  })
  const validPeriods: Period[] = ['all', 'this-month', 'next-3', 'next-6', 'next-12', 'recent', 'past']
  // `periodChoice` = choix explicite de l'utilisateur (persisté) ; null = pas encore choisi → on
  // applique le défaut selon l'acteur (dérivé plus bas), sans state à synchroniser.
  const [periodChoice, setPeriodChoice] = useState<Period | null>(
    () => validPeriods.includes(stored.period as Period) ? stored.period as Period : null
  )

  const [showQuotaModal, setShowQuotaModal] = useState(false)

  // Compagnons groupés : toujours chargés (grille = seul mode).
  const friendsByEvent = useFriendsByEvent(true)

  // Défaut « Quand » selon l'acteur : un EXPOSANT veut découvrir les nouveautés (« Ajoutés
  // récemment ») ; un visiteur garde l'agenda à venir (« all »). Dérivé → pas de setState en effet.
  const period: Period = periodChoice ?? (currentActor?.kind === 'entity' ? 'recent' : 'all')

  // ---------- Filtre "mois précis" (arrivée depuis le calendrier via navigate state) ----------
  const [monthFilter, setMonthFilter] = useState<{ year: number; month: number } | null>(() => {
    const m = (location.state as { month?: { year: number; month: number } } | null)?.month
    return m && typeof m.year === 'number' && typeof m.month === 'number' ? m : null
  })
  const monthRange = useMemo(
    () => monthFilter ? monthRangeFor(monthFilter.year, monthFilter.month) : null,
    [monthFilter]
  )
  const monthLabel = useMemo(() => {
    if (!monthFilter) return null
    const s = new Date(monthFilter.year, monthFilter.month, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    return s.charAt(0).toUpperCase() + s.slice(1)
  }, [monthFilter])

  // ---------- Derived events ----------
  const now = useMemo(() => new Date(), [])

  const displayed = useMemo(
    () => composeFilter(allEvents, { tags: selectedTags, zone, period, monthRange, geo: geo ? { lat: geo.lat, lng: geo.lng, radiusKm: geo.radiusKm } : null }, { department: person?.department ?? null, now }),
    [allEvents, selectedTags, zone, period, monthRange, geo, person?.department, now]
  )

  // ---------- Filter setters with reset + persist ----------
  const toggleTag = (value: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      persistFilters({ tags: [...next] })
      return next
    })
  }

  const handleZone = (z: Zone) => {
    setZone(z)
    persistFilters({ zone: z })
  }

  // ---------- Filtre géo (localisation + rayon) ----------
  const handleGeo = (sel: AddressSelection, radiusKm: number) => {
    const g: GeoFilter = { lat: sel.lat, lng: sel.lng, label: sel.city || sel.address, radiusKm }
    setGeo(g)
    persistFilters({ geo: g })
  }
  const handleRadius = (km: number) => {
    setGeo(prev => {
      if (!prev) return prev
      const g = { ...prev, radiusKm: km }
      persistFilters({ geo: g })
      return g
    })
  }
  const clearGeo = () => {
    setGeo(null)
    persistFilters({ geo: null })
  }

  const handlePeriod = (p: Period) => {
    setMonthFilter(null)   // choisir une période sort du mode "mois précis"
    setPeriodChoice(p)
    persistFilters({ period: p })
  }

  // ---------- Repérer (save) ----------
  const isSaved = useCallback(
    (eventId: string) => participations.some(p => p.event_id === eventId),
    [participations]
  )

  const toggleSave = useCallback(async (event: EventWithScore) => {
    if (!currentActor || !user) return
    const existing = participations.find(p => p.event_id === event.id)
    if (existing) {
      await removeParticipation(existing.id)
    } else {
      // Quota dates : entité gratuite plafonnée aux dates à venir actives.
      const plan = planForActor(currentActor, currentActorRow)
      const actorKind: 'entity' | 'person' = currentActor.kind === 'entity' ? 'entity' : 'person'
      if (!canAddDate(plan, actorKind, countActiveDates(participations, new Date()))) {
        setShowQuotaModal(true)
        return
      }
      await addParticipation({
        actor_id: currentActor.id,
        acted_by_user_id: user.id,
        event_id: event.id,
        status: 'interesse',
        visibility: 'amis',
      })
    }
    refetchParticipations()
  }, [currentActor, currentActorRow, user, participations, refetchParticipations])

  // ---------- Add image ----------
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingEventRef = useRef<EventWithScore | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const event = pendingEventRef.current
    if (!file || !event) return
    // Reset input so the same file can be re-selected later
    e.target.value = ''
    try {
      const image_url = await uploadEventImage(file)
      await supabase.from('events').update({ image_url }).eq('id', event.id)
      refetchEvents()
    } catch (err) {
      console.error('Add image failed:', err)
    }
  }

  // Ajout d'affiche collaboratif : tout exposant (+ admin) peut poser une image
  // sur un event qui n'en a pas (édition collaborative existante, pas de nouvelle RPC).
  const canAddImage = currentActor?.kind === 'entity' || isAdmin
  const onAddImage = useCallback((event: EventWithScore) => {
    pendingEventRef.current = event
    fileInputRef.current?.click()
  }, [])

  // ---------- Participation status (par event, adapté à l'acteur) ----------
  const actorKind: ActorKind = currentActor?.kind === 'entity' ? 'entity' : 'person'
  const partByEvent = useMemo(
    () => new Map(participations.map(p => [p.event_id, { status: p.status as string, payment_status: (p.payment_status as string | null) ?? null }])),
    [participations]
  )

  return (
    <div className="explorer">
      {/* Hidden file input for add-image */}
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

      <div className="stagewrap">
        <SearchSegments
          tags={dynamicTags}
          selectedTags={selectedTags}
          zone={zone}
          period={period}
          monthLabel={monthLabel}
          geo={geo}
          onToggleTag={toggleTag}
          onZone={handleZone}
          onPeriod={handlePeriod}
          onGeo={handleGeo}
          onRadius={handleRadius}
          onClearGeo={clearGeo}
        />

        <div className="xplr-count">
          {displayed.length} festival{displayed.length !== 1 ? 's' : ''} trouvé{displayed.length !== 1 ? 's' : ''}
        </div>

        {loading ? (
          <GridSkeleton />
        ) : displayed.length === 0 ? (
          <ExplorerEmpty />
        ) : (
          <EventGrid
            events={displayed}
            now={now}
            partByEvent={partByEvent}
            actorKind={actorKind}
            friendsByEvent={friendsByEvent}
            isSaved={isSaved}
            onToggleSave={toggleSave}
            onCardClick={ev => navigate(eventPath(ev))}
            canAddImage={canAddImage}
            onAddImage={onAddImage}
          />
        )}
      </div>
      {showQuotaModal && <DateQuotaModal onClose={() => setShowQuotaModal(false)} />}
    </div>
  )
}
