/**
 * QUOI     — les témoignages d'exposants en stories : chaque témoignage découpé en écrans d'une phrase,
 *            avec la couverture et l'avatar de sa vitrine ; et le passage d'un écran à l'autre.
 * POURQUOI — Uriel, 14/10/2026 (maquette 2332:2) : « Ils en parlent mieux que nous », un bouton
 *            flottant qui ouvre des stories. Une phrase à la fois se lit ; un paragraphe, non.
 * ATTENTION — les témoignages sont saisis à la main en admin (table `testimonials`) : on retire les
 *            guillemets et les retours à la ligne, jamais un mot. La vitrine publique reste servie
 *            par la V1 (`flw.sh/<adresse>`, voir features/vitrine/VitrinePage.tsx).
 */

export interface TestimonialRow {
  id: string
  name: string
  craft: string
  quote: string
  avatar_url: string | null
  actor_id: string | null
  entity_slug: string | null
}

/** Ce que la story reprend de la vitrine du compte lié. */
export interface TestimonialAccount {
  avatar_url: string | null
  banner_url: string | null
  banner_position: number
  public_slug: string | null
}

export interface Testimonial {
  id: string
  name: string
  craft: string
  slides: string[]
  avatarUrl: string | null
  coverUrl: string | null
  /** La hauteur de la couverture choisie sur la vitrine, de 0 à 100. */
  coverY: number
  vitrineUrl: string | null
}

export interface StoryAt {
  person: number
  slide: number
}

const VITRINE_ORIGIN = 'https://flw.sh'
/** Au-delà, deux phrases courtes ne tiennent plus ensemble sur un écran. */
const SLIDE_CHARACTERS = 100
const QUOTES = /^[\s“”"«»]+|[\s“”"«»]+$/g
/** Une phrase finit sur un point, un point d'exclamation ou d'interrogation suivi d'un blanc. */
const SENTENCE_END = /(?<=[.!?…])\s+/
const LETTER = /\p{L}/u

export function toSlides(quote: string): string[] {
  const sentences = quote.replace(QUOTES, '').replace(/\s+/g, ' ').split(SENTENCE_END)
  const slides: string[] = []
  for (const sentence of sentences) {
    const last = slides.at(-1)
    // Un fragment sans lettre (un emoji) reste avec la phrase qu'il termine.
    const fits = last !== undefined && last.length + 1 + sentence.length <= SLIDE_CHARACTERS
    if (last !== undefined && (fits || !LETTER.test(sentence))) {
      slides[slides.length - 1] = `${last} ${sentence}`
    } else {
      slides.push(sentence)
    }
  }
  return slides
}

/** `accounts` : la vitrine liée à chaque témoignage, par acteur. */
export function toTestimonials(
  rows: TestimonialRow[],
  accounts: Map<string, TestimonialAccount>,
): Testimonial[] {
  return rows.map((t) => {
    const account = t.actor_id ? accounts.get(t.actor_id) : undefined
    const slug = t.entity_slug ?? account?.public_slug ?? null
    return {
      id: t.id,
      name: t.name,
      craft: t.craft,
      slides: toSlides(t.quote),
      avatarUrl: t.avatar_url ?? account?.avatar_url ?? null,
      coverUrl: account?.banner_url ?? null,
      coverY: account?.banner_position ?? 50,
      vitrineUrl: slug ? `${VITRINE_ORIGIN}/${slug}` : null,
    }
  })
}

/** L'écran d'après (`1`) ou d'avant (`-1`) ; null après le tout dernier, qui ferme les stories. */
export function stepStory(
  at: StoryAt,
  direction: 1 | -1,
  stories: Pick<Testimonial, 'slides'>[],
): StoryAt | null {
  const count = stories[at.person]?.slides.length ?? 0
  if (direction === 1) {
    if (at.slide + 1 < count) return { person: at.person, slide: at.slide + 1 }
    return at.person + 1 < stories.length ? { person: at.person + 1, slide: 0 } : null
  }
  if (at.slide > 0) return { person: at.person, slide: at.slide - 1 }
  const previous = stories[at.person - 1]
  return previous ? { person: at.person - 1, slide: previous.slides.length - 1 } : at
}
