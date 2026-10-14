/**
 * QUOI     — tests de lib/testimonials.ts : un témoignage saisi en admin devient une story (écrans
 *            d'une phrase, couverture, avatar, vitrine), et le passage d'un écran à l'autre.
 * POURQUOI — les témoignages sont saisis à la main : guillemets, retours à la ligne, compte absent.
 */
import { describe, expect, it } from 'vitest'
import {
  stepStory,
  toSlides,
  toTestimonials,
  type Testimonial,
  type TestimonialAccount,
  type TestimonialRow,
} from './testimonials'

function row(over: Partial<TestimonialRow> = {}): TestimonialRow {
  return {
    id: 't1',
    name: 'Otayat',
    craft: 'Artisan bijoutière',
    quote: 'Fellowship est vraiment complet.',
    avatar_url: null,
    actor_id: 'a1',
    entity_slug: null,
    ...over,
  }
}

const ACCOUNT: TestimonialAccount = {
  avatar_url: 'https://img/compte.jpg',
  banner_url: 'https://img/couverture.jpg',
  banner_position: 72,
  public_slug: 'otayat',
}

describe('toSlides', () => {
  it('fait un écran par phrase', () => {
    expect(
      toSlides(
        'Fellowship, c’est l’ovni dans le milieu des exposants. Un véritable vaisseau spatial pour s’organiser sur une année entière.',
      ),
    ).toEqual([
      'Fellowship, c’est l’ovni dans le milieu des exposants.',
      'Un véritable vaisseau spatial pour s’organiser sur une année entière.',
    ])
  })

  it('regroupe les phrases courtes sur un même écran', () => {
    expect(toSlides('J’adore. C’est exceptionnel. Merci.')).toEqual([
      'J’adore. C’est exceptionnel. Merci.',
    ])
  })

  it('coupe sur un point d’interrogation précédé d’une espace', () => {
    expect(
      toSlides(
        'Une application qui regroupe mes vieux tableaux Excel, en mieux organisés et plus jolie ? J’ai signé direct, sans hésiter une seconde.',
      ),
    ).toEqual([
      'Une application qui regroupe mes vieux tableaux Excel, en mieux organisés et plus jolie ?',
      'J’ai signé direct, sans hésiter une seconde.',
    ])
  })

  it('retire les guillemets saisis et resserre les retours à la ligne', () => {
    expect(toSlides('“Une mine d’or. \nJ’adore.”')).toEqual(['Une mine d’or. J’adore.'])
  })

  it('laisse un emoji seul avec la phrase qu’il termine', () => {
    const long =
      'Là tout est carré, on découvre des dates comme des films sur Netflix, sans plus jamais rien perdre !'
    expect(toSlides(`${long} 💪`)).toEqual([`${long} 💪`])
  })

  it('garde une phrase sans point final', () => {
    expect(toSlides('Un vrai must')).toEqual(['Un vrai must'])
  })
})

describe('toTestimonials', () => {
  it('prend l’avatar, la couverture et la vitrine du compte lié', () => {
    const [t] = toTestimonials([row()], new Map([['a1', ACCOUNT]]))
    expect(t?.avatarUrl).toBe('https://img/compte.jpg')
    expect(t?.coverUrl).toBe('https://img/couverture.jpg')
    expect(t?.coverY).toBe(72)
    expect(t?.vitrineUrl).toBe('https://flw.sh/otayat')
  })

  it('préfère l’avatar et l’adresse saisis en admin', () => {
    const [t] = toTestimonials(
      [row({ avatar_url: 'https://img/saisi.jpg', entity_slug: 'atelier-otayat' })],
      new Map([['a1', ACCOUNT]]),
    )
    expect(t?.avatarUrl).toBe('https://img/saisi.jpg')
    expect(t?.vitrineUrl).toBe('https://flw.sh/atelier-otayat')
  })

  it('sans compte lié : ni couverture, ni vitrine', () => {
    const [t] = toTestimonials([row({ actor_id: null })], new Map())
    expect(t?.avatarUrl).toBeNull()
    expect(t?.coverUrl).toBeNull()
    expect(t?.coverY).toBe(50)
    expect(t?.vitrineUrl).toBeNull()
  })
})

describe('stepStory', () => {
  const stories: Pick<Testimonial, 'slides'>[] = [{ slides: ['a', 'b'] }, { slides: ['c'] }]

  it('avance d’un écran dans la même story', () => {
    expect(stepStory({ person: 0, slide: 0 }, 1, stories)).toEqual({ person: 0, slide: 1 })
  })

  it('passe à la story suivante après son dernier écran', () => {
    expect(stepStory({ person: 0, slide: 1 }, 1, stories)).toEqual({ person: 1, slide: 0 })
  })

  it('rend null après le dernier écran de la dernière story', () => {
    expect(stepStory({ person: 1, slide: 0 }, 1, stories)).toBeNull()
  })

  it('recule vers le dernier écran de la story précédente', () => {
    expect(stepStory({ person: 1, slide: 0 }, -1, stories)).toEqual({ person: 0, slide: 1 })
  })

  it('reste sur le premier écran de la première story', () => {
    expect(stepStory({ person: 0, slide: 0 }, -1, stories)).toEqual({ person: 0, slide: 0 })
  })
})
