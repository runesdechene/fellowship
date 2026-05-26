import { useRef } from 'react'
import { useTheme } from '@/hooks/use-theme'
import { deckCardStyle, eventBadge, participationChip, type ActorKind } from '@/lib/explorer'
import { DeckCard } from './DeckCard'
import type { EventWithScore } from '@/types/database'

export interface PartLite { status: string; payment_status: string | null }

interface EventDeckProps {
  events: EventWithScore[]
  activeIndex: number
  canAddImage: boolean
  now: Date
  /** Participation de l'acteur courant par event_id (pour la pastille de statut sur carte). */
  partByEvent: Map<string, PartLite>
  actorKind: ActorKind
  onSelect: (index: number) => void
  onPrev: () => void
  onNext: () => void
  /** Déplacement relatif (swipe tactile) : un grand/rapide geste avance de plusieurs cartes. */
  onSwipe: (delta: number) => void
  onCardClick: (event: EventWithScore) => void
  onAddImage: (event: EventWithScore) => void
}

export function EventDeck({ events, activeIndex, canAddImage, now, partByEvent, actorKind, onSelect, onPrev, onNext, onSwipe, onCardClick, onAddImage }: EventDeckProps) {
  const { theme } = useTheme()
  const isLight = theme === 'day'
  const hasPrev = activeIndex > 0
  const hasNext = activeIndex < events.length - 1

  // ── Swipe tactile : distance + vitesse → nombre de cartes parcourues ──
  const touch = useRef({ x: 0, t: 0 })
  const justSwiped = useRef(false)
  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, t: Date.now() }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touch.current.x
    if (Math.abs(dx) < 30) return // simple tap : laisse le clic agir
    const dt = Math.max(1, Date.now() - touch.current.t)
    const velocity = Math.abs(dx) / dt // px/ms
    let steps = Math.round(Math.abs(dx) / 55) // ~1 carte / 55px de glisse
    if (velocity > 0.6) steps += Math.round(velocity * 3) // bonus « flick » rapide
    steps = Math.max(1, Math.min(steps, 12))
    onSwipe(dx < 0 ? steps : -steps) // glisse vers la gauche → on avance
    justSwiped.current = true
    setTimeout(() => { justSwiped.current = false }, 350)
  }
  const handleCardClick = (offset: number, i: number, ev: EventWithScore) => {
    if (justSwiped.current) return // un swipe vient de se produire : on ignore le clic résiduel
    if (offset === 0) onCardClick(ev)
    else onSelect(i)
  }

  return (
    <div className="flow">
      {hasPrev && (
        <button className="arrow l" onClick={onPrev} aria-label="Précédent">
          <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
      )}
      <div className="deck" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {hasPrev && <button type="button" className="navzone l" onClick={onPrev} aria-label="Festival précédent" />}
        {hasNext && <button type="button" className="navzone r" onClick={onNext} aria-label="Festival suivant" />}
        {events.map((ev, i) => {
          const offset = i - activeIndex
          if (Math.abs(offset) > 3) return null // fenêtrage perf : ne pas monter les cartes lointaines
          const s = deckCardStyle(offset, isLight)
          const badge = eventBadge(ev, now)
          const part = partByEvent.get(ev.id)
          const statusChip = participationChip(part?.status, part?.payment_status, actorKind, {
            isPast: new Date(ev.end_date) < now,
          })
          return (
            <DeckCard
              key={ev.id}
              event={ev}
              isCenter={s.isCenter}
              canAddImage={canAddImage}
              badge={badge}
              statusChip={statusChip}
              style={{ transform: s.transform, opacity: s.opacity, filter: s.filter, zIndex: s.zIndex, pointerEvents: s.pointerEvents, ['--card-veil']: s.veil } as React.CSSProperties}
              onClick={() => handleCardClick(offset, i, ev)}
              onAddImage={onAddImage}
            />
          )
        })}
      </div>
      {hasNext && (
        <button className="arrow r" onClick={onNext} aria-label="Suivant">
          <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      )}
    </div>
  )
}
