/**
 * QUOI     — une rangée de l'Explorer : un titre, une phrase, les flèches, et les cartes qui
 *            glissent de gauche à droite, au doigt comme à la souris.
 * POURQUOI — l'accueil se parcourt par thèmes (où vont tes amis, ajoutés récemment, près de chez
 *            toi), chacun sur une ligne (maquette 2027).
 *            Une rangée vide qui a un `ghost` garde sa place en squelettes, avec ce qui la remplira
 *            et comment (maquette 2402:233, même langage que le tableau de bord vide).
 * ATTENTION — comme la frise du calendrier, une rangée est une zone à défilement horizontal :
 *            exception assumée au « jamais de scroll interne », et seulement à l'horizontale.
 */
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, type ReactNode } from 'react'
import { SkeletonDot, SkeletonLine, SkeletonPoster } from '@/components/ui/Skeleton'
import { useDragScroll } from '@/lib/useDragScroll'
import { ExploreCard } from './ExploreCard'
import { ProEndCard } from './ProEndCard'
import type { ExploreEvent } from './useExplorer'

interface EventRailProps {
  title: string
  subtitle: string | null
  events: ExploreEvent[]
  onMark: (event: ExploreEvent) => void
  /** En gratuit : les festivals au-delà des 6 mois, annoncés au bout de la rangée. */
  hiddenCount: number
  /** Vide : la phrase qui dit ce qui viendra, et le geste pour le faire venir. Sans lui, la rangée se tait. */
  ghost?: { note: string; action: ReactNode }
}

const GHOSTS = ['a', 'b', 'c', 'd', 'e', 'f']

/** Une carte devinée : affiche, nom, dates, visages. */
function GhostCard() {
  return (
    <span className="explore-card explore-card--ghost">
      <SkeletonPoster className="explore-card__ghost-poster" />
      <span className="explore-card__ghost-lines">
        <SkeletonLine width="70%" tone="strong" />
        <SkeletonLine width="50%" />
        <span className="explore-card__ghost-faces">
          <SkeletonDot />
          <SkeletonDot />
          <SkeletonDot />
        </span>
      </span>
    </span>
  )
}

export function EventRail({ title, subtitle, events, onMark, hiddenCount, ghost }: EventRailProps) {
  const track = useRef<HTMLDivElement>(null)
  const { dragging, handlers } = useDragScroll()

  function slide(direction: 1 | -1) {
    const el = track.current
    if (!el) return
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  if (events.length === 0) {
    if (!ghost) return null
    return (
      <section className="rail">
        <header className="rail__head">
          <div>
            <h2 className="rail__title">{title}</h2>
            <p className="rail__subtitle">{ghost.note}</p>
          </div>
          {ghost.action}
        </header>
        <div className="rail__track rail__track--ghost" aria-hidden="true">
          {GHOSTS.map((key) => (
            <GhostCard key={key} />
          ))}
        </div>
      </section>
    )
  }

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
      <div
        className={dragging ? 'rail__track rail__track--dragging' : 'rail__track'}
        ref={track}
        {...handlers}
      >
        {events.map((event) => (
          <ExploreCard key={event.id} event={event} onMark={onMark} />
        ))}
        <ProEndCard count={hiddenCount} />
      </div>
    </section>
  )
}
