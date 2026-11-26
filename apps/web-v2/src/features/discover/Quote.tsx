/**
 * QUOI     — un témoignage en grand : sa première phrase, son auteur.
 * POURQUOI — maquette du 26/11/2026. Les témoignages sont ceux de l'admin ; aucun n'est écrit ici.
 * ATTENTION — la première « diapo » des stories (lib/testimonials.ts) : des phrases entières,
 *            jamais coupées.
 */
import type { Testimonial } from '@/lib/testimonials'

export function Quote({ testimonial }: { testimonial: Testimonial }) {
  const { name, craft, slides, avatarUrl, vitrineUrl } = testimonial

  return (
    <figure className="discover-quote">
      <blockquote>« {slides[0]} »</blockquote>
      <figcaption>
        {avatarUrl && <img src={avatarUrl} alt="" loading="lazy" />}
        {vitrineUrl ? <a href={vitrineUrl}>{name}</a> : <strong>{name}</strong>}
        <span>{craft}</span>
      </figcaption>
    </figure>
  )
}
