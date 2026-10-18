/**
 * QUOI     — les stories des témoignages : une carte verticale par exposant, sa couverture de vitrine
 *            en fond, une phrase par écran ; les exposants voisins de part et d'autre.
 * POURQUOI — maquette 2332:2 (Uriel, 14/10/2026). Le nom mène à la vitrine ; le bouton, à
 *            « Commencer gratuitement » : on sort d'une story convaincu, c'est le moment de s'inscrire.
 * ATTENTION — l'élément <dialog> fait le voile, Échap et le piège du focus. Un écran avance à la fin
 *            de sa barre (animationend) : appuyer longtemps met la barre, donc la story, en pause.
 *            Toucher à gauche recule, ailleurs avance ; glisser change d'exposant.
 */
import { ArrowRight, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { stepStory, type StoryAt, type Testimonial } from '@/lib/testimonials'

/** Au-delà, la phrase passe dans un corps plus petit. */
const LONG_SLIDE = 140
const SWIPE = 50
const HOLD_MS = 250
/** Les exposants voisins, et leur place de part et d'autre de la carte (ordre CSS). */
const NEIGHBOURS = [
  { offset: -2, order: 1 },
  { offset: -1, order: 2 },
  { offset: 1, order: 6 },
  { offset: 2, order: 7 },
]

interface StoryDialogProps {
  testimonials: Testimonial[]
  /** L'exposant ouvert, ou null quand les stories sont fermées. */
  person: number | null
  onPerson: (person: number) => void
  onClose: () => void
}

export function StoryDialog({ testimonials, person, onPerson, onClose }: StoryDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const open = person !== null

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
  }, [open])

  return (
    <dialog
      ref={dialog}
      className="landing-stories"
      aria-label="Ils en parlent mieux que nous"
      onClose={() => {
        // Échap ferme le <dialog> lui-même : on le dit à la landing.
        if (open) onClose()
      }}
      onClick={(event) => {
        // Un clic sur le voile, hors de la story et de ses boutons, ferme les stories.
        const target = event.target as HTMLElement
        if (target === event.currentTarget || target.classList.contains('landing-stories__stage'))
          onClose()
      }}
    >
      {/* Le <dialog> donne le focus au premier bouton qu'il contient : celui de la story, pour que
          les flèches du clavier y arrivent. Le titre et « Fermer » viennent donc après. */}
      {person !== null && (
        <StoryPlayer
          testimonials={testimonials}
          start={person}
          onPerson={onPerson}
          onClose={onClose}
        />
      )}
      <p className="landing-stories__title">Ils en parlent mieux que nous</p>
      <button type="button" className="landing-stories__close" onClick={onClose}>
        Fermer <X size={16} strokeWidth={2} aria-hidden />
      </button>
    </dialog>
  )
}

interface StoryPlayerProps {
  testimonials: Testimonial[]
  start: number
  onPerson: (person: number) => void
  onClose: () => void
}

function StoryPlayer({ testimonials, start, onPerson, onClose }: StoryPlayerProps) {
  const [at, setAt] = useState<StoryAt>({ person: start, slide: 0 })
  const [paused, setPaused] = useState(false)
  const press = useRef({ x: 0, time: 0 })
  const story = testimonials[at.person]
  if (!story) return null
  const slide = story.slides[at.slide] ?? ''

  function moveTo(next: StoryAt) {
    if (next.person !== at.person) onPerson(next.person)
    setAt(next)
  }

  function step(direction: 1 | -1) {
    const next = stepStory(at, direction, testimonials)
    if (next) moveTo(next)
    else onClose()
  }

  function jump(person: number) {
    if (testimonials[person]) moveTo({ person, slide: 0 })
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    press.current = { x: event.clientX, time: event.timeStamp }
    setPaused(true)
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    setPaused(false)
    const dx = event.clientX - press.current.x
    if (Math.abs(dx) > SWIPE) {
      jump(at.person + (dx < 0 ? 1 : -1))
      return
    }
    if (event.timeStamp - press.current.time > HOLD_MS) return
    const box = event.currentTarget.getBoundingClientRect()
    step(event.clientX < box.left + box.width / 3 ? -1 : 1)
  }

  const who = (
    <>
      <Avatar src={story.avatarUrl} name={story.name} className="landing-story__face" />
      <span>
        <strong>{story.name}</strong>
        <small>{story.craft}</small>
      </span>
    </>
  )

  return (
    <div
      className="landing-stories__stage"
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') step(1)
        if (event.key === 'ArrowLeft') step(-1)
      }}
    >
      {NEIGHBOURS.map(({ offset, order: place }) => {
        const index = at.person + offset
        const other = testimonials[index]
        return other ? (
          <button
            key={offset}
            type="button"
            className={`landing-story-side${Math.abs(offset) > 1 ? ' is-far' : ''}`}
            style={{ '--side-order': place } as CSSProperties}
            onClick={() => {
              jump(index)
            }}
          >
            <span className="landing-stories-ring">
              <Avatar src={other.avatarUrl} name={other.name} />
            </span>
            {other.name}
          </button>
        ) : (
          <span
            key={offset}
            className={`landing-story-side is-empty${Math.abs(offset) > 1 ? ' is-far' : ''}`}
            style={{ '--side-order': place } as CSSProperties}
          />
        )
      })}

      <button
        type="button"
        className="landing-stories__arrow landing-stories__arrow--back"
        onClick={() => {
          step(-1)
        }}
        aria-label="Précédent"
      >
        <ChevronLeft size={20} strokeWidth={2} />
      </button>

      <article className={`landing-story${paused ? ' is-paused' : ''}`}>
        {story.coverUrl && (
          <img
            className="landing-story__cover"
            src={story.coverUrl}
            style={{ '--cover-y': `${String(story.coverY)}%` } as CSSProperties}
            alt=""
          />
        )}
        <div className="landing-story__progress">
          {story.slides.map((_, i) => (
            <span key={i} className={i < at.slide ? 'is-done' : undefined}>
              {i === at.slide && (
                <i
                  key={`${String(at.person)}-${String(at.slide)}`}
                  onAnimationEnd={() => {
                    step(1)
                  }}
                />
              )}
            </span>
          ))}
        </div>
        <header className="landing-story__head">
          {story.vitrineUrl ? (
            <a className="landing-story__who" href={story.vitrineUrl}>
              {who}
            </a>
          ) : (
            <span className="landing-story__who">{who}</span>
          )}
          <button
            type="button"
            className="landing-story__close"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </header>
        <div
          className="landing-story__body"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            setPaused(false)
          }}
        >
          <span className="landing-story__mark" aria-hidden>
            “
          </span>
          <p className={`landing-story__quote${slide.length > LONG_SLIDE ? ' is-long' : ''}`}>
            {slide}
          </p>
        </div>
        <Link
          className="landing-button landing-button--pill landing-button--cream landing-story__cta"
          to="/connexion"
        >
          Commencer gratuitement
          <ArrowRight size={17} strokeWidth={2} aria-hidden />
        </Link>
      </article>

      <button
        type="button"
        className="landing-stories__arrow landing-stories__arrow--next"
        onClick={() => {
          step(1)
        }}
        aria-label="Suivant"
      >
        <ChevronRight size={20} strokeWidth={2} />
      </button>
    </div>
  )
}
