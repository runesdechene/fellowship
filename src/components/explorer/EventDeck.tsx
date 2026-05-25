import { deckCardStyle, eventBadge } from '@/lib/explorer'
import { DeckCard } from './DeckCard'
import type { EventWithScore } from '@/types/database'

interface EventDeckProps {
  events: EventWithScore[]
  activeIndex: number
  canAddImage: boolean
  now: Date
  onSelect: (index: number) => void
  onPrev: () => void
  onNext: () => void
  onCardClick: (event: EventWithScore) => void
  onAddImage: (event: EventWithScore) => void
}

export function EventDeck({ events, activeIndex, canAddImage, now, onSelect, onPrev, onNext, onCardClick, onAddImage }: EventDeckProps) {
  const hasPrev = activeIndex > 0
  const hasNext = activeIndex < events.length - 1
  return (
    <div className="flow">
      {hasPrev && (
        <button className="arrow l" onClick={onPrev} aria-label="Précédent">
          <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
      )}
      <div className="deck">
        {hasPrev && <button type="button" className="navzone l" onClick={onPrev} aria-label="Festival précédent" />}
        {hasNext && <button type="button" className="navzone r" onClick={onNext} aria-label="Festival suivant" />}
        {events.map((ev, i) => {
          const offset = i - activeIndex
          if (Math.abs(offset) > 3) return null // fenêtrage perf : ne pas monter les cartes lointaines
          const s = deckCardStyle(offset)
          const badge = eventBadge(ev, now)
          return (
            <DeckCard
              key={ev.id}
              event={ev}
              isCenter={s.isCenter}
              canAddImage={canAddImage}
              badge={badge}
              style={{ transform: s.transform, opacity: s.opacity, filter: s.filter, zIndex: s.zIndex, pointerEvents: s.pointerEvents }}
              onClick={() => (offset === 0 ? onCardClick(ev) : onSelect(i))}
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
