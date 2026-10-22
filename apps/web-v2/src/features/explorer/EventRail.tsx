/**
 * QUOI     — une rangée de l'Explorer : un titre, une phrase, les flèches, et les cartes qui
 *            glissent de gauche à droite, au doigt comme à la souris.
 * POURQUOI — l'accueil se parcourt par thèmes (où vont tes amis, ajoutés récemment, près de chez
 *            toi), chacun sur une ligne (maquette 2027).
 *            Une rangée vide qui a un `ghost` garde sa place : trois cartes devinées, puis la carte
 *            qui dit comment la remplir (même langage que le tableau de bord vide).
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
  /** Vide : la phrase qui dit ce qui viendra, et la carte qui invite à la remplir. Sans lui, la rangée se tait. */
  ghost?: { note: string; card: ReactNode }
}

const GHOSTS = ['a', 'b', 'c']

/** Une carte devinée : affiche, nom, dates, visages. */
function GhostCard() {
  return (
    <span className="explore-card explore-card--ghost" aria-hidden="true">
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
        </header>
        <div className="rail__track rail__track--ghost">
          {GHOSTS.map((key) => (
            <GhostCard key={key} />
          ))}
          {ghost.card}
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
