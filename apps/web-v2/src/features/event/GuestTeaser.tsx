/**
 * QUOI     — sur la fiche vue sans compte, l'aperçu des avis et des questions : « 4 avis · 7
 *            questions », des lignes floutées, « Crée ton compte gratuit pour les lire ».
 * POURQUOI — lot 11b (Uriel, 15/10/2026) : montrer qu'il y a de quoi lire, pour donner envie
 *            de créer un compte.
 * ATTENTION — les lignes sont décoratives : AUCUN contenu réel n'arrive au navigateur. Sans avis
 *            ni question, l'aperçu ne s'affiche pas.
 */
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { teaserLine } from '@/lib/teaser'
import { useEventTeaser } from './useEventTeaser'

export function GuestTeaser({ eventId }: { eventId: string }) {
  const counts = useEventTeaser(eventId)
  const line = counts ? teaserLine(counts.reviews, counts.questions) : null
  if (!line) return null

  return (
    <section className="event-page__block guest-teaser" aria-labelledby="guest-teaser-title">
      <h2 id="guest-teaser-title" className="event-page__block-title">
        {line}
      </h2>
      <div className="guest-teaser__ghost" aria-hidden>
        <span className="guest-teaser__line" />
        <span className="guest-teaser__line" />
        <span className="guest-teaser__line" />
        <span className="guest-teaser__line" />
      </div>
      <Link className="guest-teaser__cta" to="/connexion">
        Crée ton compte gratuit pour les lire
        <ArrowRight size={14} strokeWidth={2} aria-hidden />
      </Link>
    </section>
  )
}
