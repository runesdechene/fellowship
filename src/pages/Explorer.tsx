import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useEvents } from '@/hooks/use-events'
import { useAuth } from '@/lib/auth'
import { useTags } from '@/hooks/use-tags'
import { useMyParticipations, addParticipation, removeParticipation } from '@/hooks/use-participations'
import { composeFilter, eventBadge, type Zone, type Period } from '@/lib/explorer'
import { uploadEventImage } from '@/lib/event-image'
import { supabase } from '@/lib/supabase'
import { EventDeck } from '@/components/explorer/EventDeck'
import { SearchSegments } from '@/components/explorer/SearchSegments'
import { EventDock } from '@/components/explorer/EventDock'
import { getTagLandingColor } from '@/components/ui/TagBadge'
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

// ---------- Skeleton ----------
function DeckSkeleton() {
  return (
    <div className="flow">
      <div className="deck">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="card"
            style={{
              transform: `translate(-50%,-50%) translateX(${(i - 1) * 104}%) scale(${i === 1 ? 1 : 0.74})`,
              opacity: i === 1 ? 1 : 0.4,
              background: 'hsl(var(--card))',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
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
  const { profile, currentActor, isAdmin, user } = useAuth()
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
  const [period, setPeriod] = useState<Period>(
    () => {
      const validPeriods: Period[] = ['all', 'this-month', 'next-3', 'next-6', 'next-12', 'recent', 'past']
      return validPeriods.includes(stored.period as Period) ? stored.period as Period : 'all'
    }
  )

  // ---------- Active index ----------
  const [activeIndex, setActiveIndex] = useState(0)

  // ---------- Derived events ----------
  const now = useMemo(() => new Date(), [])

  const displayed = useMemo(
    () => composeFilter(allEvents, { tags: selectedTags, zone, period }, { department: profile?.department ?? null, now }),
    [allEvents, selectedTags, zone, period, profile?.department, now]
  )

  // Clamp activeIndex when displayed shrinks
  const safeIndex = displayed.length > 0 ? Math.min(activeIndex, displayed.length - 1) : 0

  // ---------- Navigation ----------
  const go = useCallback((d: number) => {
    if (displayed.length === 0) return
    setActiveIndex(i => Math.max(0, Math.min(displayed.length - 1, i + d)))
  }, [displayed.length])

  // ---------- Autoplay ----------
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  useEffect(() => {
    if (reducedMotion || displayed.length <= 1) return
    const id = setInterval(() => {
      setActiveIndex(i => (i + 1) % displayed.length)
    }, 4500)
    return () => clearInterval(id)
  }, [displayed.length, reducedMotion])

  // ---------- Keyboard ----------
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [go])

  // ---------- Filter setters with reset + persist ----------
  const toggleTag = (value: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      persistFilters({ tags: [...next] })
      return next
    })
    setActiveIndex(0)
  }

  const handleZone = (z: Zone) => {
    setZone(z)
    persistFilters({ zone: z })
    setActiveIndex(0)
  }

  const handlePeriod = (p: Period) => {
    setPeriod(p)
    persistFilters({ period: p })
    setActiveIndex(0)
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
      await addParticipation({
        actor_id: currentActor.id,
        acted_by_user_id: user.id,
        event_id: event.id,
        status: 'interesse',
        visibility: 'amis',
      })
    }
    refetchParticipations()
  }, [currentActor, user, participations, refetchParticipations])

  // ---------- Add image ----------
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingEventRef = useRef<EventWithScore | null>(null)

  const onAddImage = useCallback((event: EventWithScore) => {
    pendingEventRef.current = event
    fileInputRef.current?.click()
  }, [])

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

  // ---------- canAddImage ----------
  const canAddImage = currentActor?.kind === 'entity' || isAdmin

  // ---------- Current event (safely indexed) ----------
  const currentEvent = displayed.length > 0 ? displayed[safeIndex] : null

  // ---------- Tag info for dock ----------
  const activeTagInfo = useMemo(() => {
    const t = currentEvent?.tags?.[0]
    return t ? dynamicTags.find(d => d.value === t) : undefined
  }, [currentEvent, dynamicTags])

  // ---------- Participation status ----------
  const activeStatus = currentEvent ? (participations.find(p => p.event_id === currentEvent.id)?.status ?? null) : null

  // ---------- Badge (Nouveau / Populaire) ----------
  const activeBadge = currentEvent ? eventBadge(currentEvent, now) : null

  // ---------- Halo accent (couleur de la catégorie de l'affiche active) ----------
  const haloAccent = currentEvent ? getTagLandingColor(currentEvent.tags?.[0] ?? 'autre') : '#e8a06a'

  return (
    <div className="explorer" style={{ '--xh-accent': haloAccent } as React.CSSProperties}>
      {/* Halos d'ambiance (teintes landing ; le halo principal suit la couleur de l'affiche active) */}
      <div className="xhalos" aria-hidden="true">
        <span className="xb xb1" />
        <span className="xb xb2" />
        <span className="xb xb3" />
        <span className="xb xb4" />
      </div>

      {/* Hidden file input for add-image */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div className="stagewrap">
        <SearchSegments
          tags={dynamicTags}
          selectedTags={selectedTags}
          zone={zone}
          period={period}
          userDept={profile?.department ?? null}
          onToggleTag={toggleTag}
          onZone={handleZone}
          onPeriod={handlePeriod}
        />

        <div className="stagebody">
          {loading ? (
            <DeckSkeleton />
          ) : displayed.length > 0 && currentEvent ? (
            <>
              {activeBadge && (
                <div className={'deck-badge ' + activeBadge}>
                  {activeBadge === 'nouveau' ? '🆕 Nouveau' : '🔥 Populaire'}
                </div>
              )}
              <EventDeck
                events={displayed}
                activeIndex={safeIndex}
                canAddImage={canAddImage}
                onSelect={i => setActiveIndex(i)}
                onPrev={() => go(-1)}
                onNext={() => go(1)}
                onCardClick={ev => navigate(`/evenement/${ev.id}`)}
                onAddImage={onAddImage}
              />
              <div className="infozone">
                <EventDock
                  event={currentEvent}
                  status={activeStatus}
                  tagInfo={activeTagInfo}
                />
              </div>
            </>
          ) : (
            <ExplorerEmpty />
          )}
        </div>

        <div className="bottombar">
          {currentEvent && (
            <div className="dock-cta">
              <Link to={`/evenement/${currentEvent.id}`} className="btn btn-ghost">Voir le festival</Link>
              <button type="button" className="btn btn-star" onClick={() => toggleSave(currentEvent)} aria-pressed={isSaved(currentEvent.id)}>
                {isSaved(currentEvent.id) ? '★ Repéré' : '★ Repérer'}
              </button>
            </div>
          )}
          <div className="counter">
            <b>{displayed.length > 0 ? safeIndex + 1 : 0}</b>
            {' / '}
            {displayed.length} festival{displayed.length !== 1 ? 's' : ''} trouvé{displayed.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  )
}
