/**
 * QUOI     — tests de lib/testimonials.ts : un témoignage saisi en admin devient ce que la landing
 *            affiche (première phrase, suite, avatar).
 * POURQUOI — les témoignages sont saisis à la main : guillemets, retours à la ligne, avatar absent.
 */
import { describe, expect, it } from 'vitest'
import { toTestimonials, type TestimonialRow } from './testimonials'

function row(over: Partial<TestimonialRow> = {}): TestimonialRow {
  return {
    id: 't1',
    name: 'Otayat',
    craft: 'Artisan bijoutière',
    quote: 'Fellowship est vraiment complet. Cela faisait longtemps.',
    avatar_url: null,
    actor_id: 'a1',
    ...over,
  }
}

describe('toTestimonials', () => {
  it('sépare la première phrase de la suite', () => {
    const [t] = toTestimonials([row()], new Map())
    expect(t?.lead).toBe('Fellowship est vraiment complet.')
    expect(t?.rest).toBe('Cela faisait longtemps.')
  })

  it('coupe aussi sur un point d’interrogation précédé d’une espace', () => {
    const [t] = toTestimonials(
      [row({ quote: 'On ne peut plus jolie ? J’ai signé direct.' })],
      new Map(),
    )
    expect(t?.lead).toBe('On ne peut plus jolie ?')
    expect(t?.rest).toBe('J’ai signé direct.')
  })

  it('retire les guillemets saisis et resserre les retours à la ligne', () => {
    const [t] = toTestimonials([row({ quote: '“Une mine d’or. \nJ’adore.”' })], new Map())
    expect(t?.lead).toBe('Une mine d’or.')
    expect(t?.rest).toBe('J’adore.')
  })

  it('garde une phrase unique entière, sans suite', () => {
    const [t] = toTestimonials([row({ quote: 'Un vrai must' })], new Map())
    expect(t?.lead).toBe('Un vrai must')
    expect(t?.rest).toBe('')
  })

  it('prend l’avatar saisi, sinon celui du compte lié, sinon aucun', () => {
    const avatars = new Map([['a1', 'https://img/compte.jpg']])
    const [own, linked, none] = toTestimonials(
      [
        row({ avatar_url: 'https://img/saisi.jpg' }),
        row({ id: 't2' }),
        row({ id: 't3', actor_id: null }),
      ],
      avatars,
    )
    expect(own?.avatarUrl).toBe('https://img/saisi.jpg')
    expect(linked?.avatarUrl).toBe('https://img/compte.jpg')
    expect(none?.avatarUrl).toBeNull()
  })
})
