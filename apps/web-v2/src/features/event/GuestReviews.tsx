/**
 * QUOI     — sur la fiche vue sans compte, les avis : la note globale et un avis entier dans une
 *            même carte, puis « Lire les N autres avis, avec ton compte gratuit ».
 * POURQUOI — décision du 23/10/2026 (maquette 2482:878) : la note et un vrai avis en clair, c'est
 *            ce que cherche qui tape « nom du festival avis » ; le reste attend le compte gratuit.
 * ATTENTION — pas de voile ni de faux texte. Sans avis, rien ; sans texte d'avis, la note seule.
 */
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Stars } from '@/components/ui/Stars'
import { moreReviewsLink } from '@/lib/apercu'
import { formatScore } from '@/lib/reviews'
import { loginReturning } from '@/lib/welcome'
import type { FicheApercu } from './useFicheApercu'

export function GuestReviews({ apercu }: { apercu: FicheApercu }) {
  const { pathname } = useLocation()
  const { reviews, score, excerpt, excerptYear } = apercu
  if (reviews === 0 || score === null) return null
  const more = moreReviewsLink(reviews, Boolean(excerpt))

  return (
    <section className="event-page__block">
      <h2 className="event-page__block-title">
        Avis des exposants
        <span className="event-page__block-hint">{reviews} avis</span>
      </h2>
      <div className="reviews__scores reviews__scores--guest">
        <div className="reviews__overall">
          <span className="reviews__score">{formatScore(score)}</span>
          <Stars score={score} />
          <span className="reviews__caption">note globale</span>
        </div>
        {excerpt && (
          <figure className="reviews__quote reviews__quote--inline">
            <blockquote>« {excerpt} »</blockquote>
            <figcaption>
              <ShieldCheck size={12} strokeWidth={1.8} />
              Un exposant{excerptYear ? `, édition ${String(excerptYear)}` : ''}
            </figcaption>
          </figure>
        )}
      </div>
      {more && (
        <div className="reviews__actions">
          <Link className="reviews__link" to={loginReturning(pathname)}>
            {more}
            <ArrowRight size={13} strokeWidth={2} />
          </Link>
        </div>
      )}
    </section>
  )
}
