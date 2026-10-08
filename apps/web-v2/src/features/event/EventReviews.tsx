/**
 * QUOI     — le bloc « Avis des exposants » de la fiche : la note globale en serif et ses étoiles,
 *            le détail (affluence, organisation, rentabilité), un extrait, puis tous les avis.
 * POURQUOI — les exposants choisissent leurs dates sur l'avis des autres ; la note se lit d'un
 *            coup, l'extrait donne le ton (maquette 2027).
 * ATTENTION — l'auteur d'un avis ne se nomme que si la base l'autorise (reviewSignature). Le
 *            détail porte le badge Pro : en gratuit, il passe sous un voile ; la note globale et
 *            la lecture des avis restent ouvertes (Dev.md, 07/10/2026).
 */
import { ArrowRight, Pencil, ShieldCheck } from 'lucide-react'
import { ProBadge } from '@/components/ui/ProBadge'
import { ProVeil } from '@/components/ui/ProVeil'
import { useTransitionNavigate } from '@/lib/navigation'
import { usePlan } from '@/lib/usePlan'
import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Stars } from '@/components/ui/Stars'
import { formatScore, reviewSignature } from '@/lib/reviews'
import type { EventReview } from './useEventReviews'
import { useEventReviews } from './useEventReviews'

function Quote({ review }: { review: EventReview }) {
  return (
    <figure className="reviews__quote">
      <blockquote>« {review.comment} »</blockquote>
      <figcaption>
        <ShieldCheck size={12} strokeWidth={1.8} />
        {reviewSignature(review)}
      </figcaption>
    </figure>
  )
}

interface EventReviewsProps {
  eventId: string
  viewerId: string | null | undefined
  /** L'exposant était inscrit et la date est passée : il peut donner son avis. */
  canReview: boolean
}

/** Le détail des notes : affluence, organisation, rentabilité. */
function ScoreBars({
  scores,
}: {
  scores: { affluence: number; organisation: number; rentabilite: number }
}) {
  return (
    <>
      {(
        [
          ['Affluence', scores.affluence],
          ['Organisation', scores.organisation],
          ['Rentabilité', scores.rentabilite],
        ] as const
      ).map(([label, value]) => (
        <div key={label} className="reviews__bar-row">
          <span>{label}</span>
          <span className="reviews__bar" style={{ '--bar': String(value / 5) } as CSSProperties} />
          <b>{formatScore(value)}</b>
        </div>
      ))}
    </>
  )
}

export function EventReviews({ eventId, viewerId, canReview }: EventReviewsProps) {
  const { scores, reviews, error } = useEventReviews(eventId, viewerId)
  const { pro } = usePlan()
  const go = useTransitionNavigate()
  const [open, setOpen] = useState(false)
  const withComment = reviews.filter((review) => review.comment)
  const [first, ...others] = withComment
  const mine = reviews.some((review) => review.isSelf)

  if (!scores && !canReview && !error) return null

  return (
    <section className="event-page__block">
      <h2 className="event-page__block-title">
        Avis des exposants
        {scores && <span className="event-page__block-hint">{scores.count} avis</span>}
      </h2>

      {error && <p className="event-page__state">{error}</p>}

      {scores ? (
        <div className="reviews__scores">
          <div className="reviews__overall">
            <span className="reviews__score">{formatScore(scores.overall)}</span>
            <Stars score={scores.overall} />
            <span className="reviews__caption">note globale</span>
          </div>
          <div className="reviews__detail">
            <span className="reviews__caption">
              Le détail <ProBadge />
            </span>
            {pro ? (
              <ScoreBars scores={scores} />
            ) : (
              <ProVeil
                invitation={
                  <button type="button" className="reports__invite" onClick={() => go('/pro')}>
                    Voir le détail avec le Pro
                    <ArrowRight size={14} strokeWidth={2} />
                  </button>
                }
              >
                <ScoreBars scores={scores} />
              </ProVeil>
            )}
          </div>
        </div>
      ) : (
        !error && <p className="event-page__state">Personne n’a encore noté cette date.</p>
      )}

      {first && <Quote review={first} />}
      {open && others.map((review) => <Quote key={review.id} review={review} />)}

      <div className="reviews__actions">
        {others.length > 0 && (
          <button
            type="button"
            className="reviews__link"
            aria-expanded={open}
            onClick={() => {
              setOpen((value) => !value)
            }}
          >
            {open ? 'Replier les avis' : `Lire les ${withComment.length} avis`}
            <ArrowRight size={13} strokeWidth={2} />
          </button>
        )}
        {canReview && (
          <Link className="reviews__link" to={`/evenement/${eventId}/avis`}>
            <Pencil size={13} strokeWidth={2} />
            {mine ? 'Modifier mon avis' : 'Donner mon avis'}
          </Link>
        )}
      </div>
    </section>
  )
}
