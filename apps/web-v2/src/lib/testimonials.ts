/**
 * QUOI     — les témoignages d'exposants, prêts pour la landing : la première phrase, la suite et
 *            l'avatar.
 * POURQUOI — Uriel, 14/10/2026 : les témoignages reviennent sur la landing. Ils se lisent comme ses
 *            grands paragraphes, la première phrase pleine et la suite adoucie.
 * ATTENTION — ils sont saisis à la main en admin (table `testimonials`) : on retire les guillemets
 *            et les retours à la ligne, jamais un mot.
 */

export interface TestimonialRow {
  id: string
  name: string
  craft: string
  quote: string
  avatar_url: string | null
  actor_id: string | null
}

export interface Testimonial {
  id: string
  name: string
  craft: string
  lead: string
  rest: string
  avatarUrl: string | null
}

/** La première phrase s'arrête au premier point, point d'exclamation ou d'interrogation suivi d'un blanc. */
const FIRST_SENTENCE = /^(.*?[.!?…])\s+(.*)$/s
const QUOTES = /^[\s“”"«»]+|[\s“”"«»]+$/g

/** `avatars` : l'avatar du compte lié à chaque témoignage, par acteur. */
export function toTestimonials(
  rows: TestimonialRow[],
  avatars: Map<string, string>,
): Testimonial[] {
  return rows.map((t) => {
    const quote = t.quote.replace(QUOTES, '').replace(/\s+/g, ' ')
    const [, lead = quote, rest = ''] = FIRST_SENTENCE.exec(quote) ?? []
    return {
      id: t.id,
      name: t.name,
      craft: t.craft,
      lead,
      rest,
      avatarUrl: t.avatar_url ?? (t.actor_id ? avatars.get(t.actor_id) : undefined) ?? null,
    }
  })
}
