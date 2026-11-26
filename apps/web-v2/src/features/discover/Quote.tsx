/**
 * QUOI     — un témoignage en grand : son début, son auteur.
 * POURQUOI — maquette du 26/11/2026. Les témoignages sont ceux de l'admin ; aucun n'est écrit ici.
 * ATTENTION — la première « diapo » des stories (lib/testimonials.ts) : des phrases entières,
 *            jamais coupées.
 */
import type { Testimonial } from '@/lib/testimonials'

export function Quote({
  testimonial,
  sentences = 1,
}: {
  testimonial: Testimonial
  /** Combien d'écrans de story montrer, depuis le début. */
  sentences?: number
}) {
  const { name, craft, slides, avatarUrl, vitrineUrl } = testimonial

  return (
    <figure className="discover-quote">
      <blockquote>« {slides.slice(0, sentences).join(' ')} »</blockquote>
      <figcaption>
        {avatarUrl && <img src={avatarUrl} alt="" loading="lazy" />}
        {vitrineUrl ? <a href={vitrineUrl}>{name}</a> : <strong>{name}</strong>}
        <span>{craft}</span>
      </figcaption>
    </figure>
  )
}
