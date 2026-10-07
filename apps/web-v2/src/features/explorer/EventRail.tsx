/**
 * QUOI     — une rangée de l'Explorer : un titre, une phrase, les flèches, et les cartes qui
 *            glissent de gauche à droite.
 * POURQUOI — l'accueil se parcourt par thèmes (où vont tes amis, ajoutés récemment, près de chez
 *            toi), chacun sur une ligne (maquette 2027).
 * ATTENTION — comme la frise du calendrier, une rangée est une zone à défilement horizontal :
 *            exception assumée au « jamais de scroll interne », et seulement à l'horizontale.
 */
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef } from 'react'
import { ExploreCard } from './ExploreCard'
import type { ExploreEvent } from './useExplorer'

interface EventRailProps {
  title: string
  subtitle: string | null
  events: ExploreEvent[]
  onMark: (event: ExploreEvent) => void
}

export function EventRail({ title, subtitle, events, onMark }: EventRailProps) {
  const track = useRef<HTMLDivElement>(null)

  function slide(direction: 1 | -1) {
    const el = track.current
    if (!el) return
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  if (events.length === 0) return null

  return (
    <section className="rail">
      <header className="rail__head">
        <div>
          <h2 className="rail__title">{title}</h2>
          {subtitle && <p className="rail__subtitle">{subtitle}</p>}
        </div>
        <div className="rail__arrows">
          <button
            type="button"
            className="rail__arrow"
            aria-label="Cartes précédentes"
            onClick={() => {
              slide(-1)
            }}
          >
            <ChevronLeft size={14} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="rail__arrow"
            aria-label="Cartes suivantes"
            onClick={() => {
              slide(1)
            }}
          >
            <ChevronRight size={14} strokeWidth={2} />
          </button>
        </div>
      </header>
      <div className="rail__track" ref={track}>
        {events.map((event) => (
          <ExploreCard key={event.id} event={event} onMark={onMark} />
        ))}
      </div>
    </section>
  )
}
