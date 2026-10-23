/**
 * QUOI     — tests de lib/apercu.ts : ce qu'une fiche sans compte dit de qui y va.
 * POURQUOI — la ligne s'écrit avec des métiers saisis en texte libre ; la logique se teste ici,
 *            sans navigateur (.claude/rules/dev.md).
 */
import { goingLine, metiersFrom, moreReviewsLink } from './apercu'

describe('goingLine', () => {
  it('nomme le nombre, puis les métiers', () => {
    expect(
      goingLine(3, [
        { metier: 'Forgeron', n: 2 },
        { metier: 'Marque de vêtement', n: 1 },
      ]),
    ).toEqual({ count: '3 exposants y vont', crafts: 'forgeron, marque de vêtement' })
  })

  it('termine par « … » quand des exposants n’ont pas de métier affiché', () => {
    expect(goingLine(12, [{ metier: 'Forgeron', n: 3 }])).toEqual({
      count: '12 exposants y vont',
      crafts: 'forgeron…',
    })
  })

  it('accorde au singulier, et se tait sans métier', () => {
    expect(goingLine(1, [])).toEqual({ count: '1 exposant y va', crafts: null })
    expect(goingLine(2, [])).toEqual({ count: '2 exposants y vont', crafts: null })
  })

  it('ne dit rien quand personne n’y va', () => {
    expect(goingLine(0, [])).toBeNull()
  })
})

describe('metiersFrom', () => {
  it('lit la liste rendue par apercu_fiche', () => {
    expect(metiersFrom([{ metier: 'Auteur', n: 1 }])).toEqual([{ metier: 'Auteur', n: 1 }])
  })

  it('écarte ce qui n’a pas la bonne forme', () => {
    expect(metiersFrom(null)).toEqual([])
    expect(metiersFrom({ metier: 'Auteur' })).toEqual([])
    expect(metiersFrom([{ metier: 'Auteur' }, 'x', { metier: 'Potier', n: 2 }])).toEqual([
      { metier: 'Potier', n: 2 },
    ])
  })
})

describe('moreReviewsLink', () => {
  it('compte les avis qu’on ne montre pas, au singulier comme au pluriel', () => {
    expect(moreReviewsLink(3, true)).toBe('Lire les 2 autres avis, avec ton compte gratuit')
    expect(moreReviewsLink(2, true)).toBe('Lire l’autre avis, avec ton compte gratuit')
  })

  it('sans extrait affiché, aucun avis n’est « autre »', () => {
    expect(moreReviewsLink(3, false)).toBe('Lire les 3 avis, avec ton compte gratuit')
    expect(moreReviewsLink(1, false)).toBe('Lire l’avis, avec ton compte gratuit')
  })

  it('se tait quand tout est déjà montré', () => {
    expect(moreReviewsLink(1, true)).toBeNull()
    expect(moreReviewsLink(0, false)).toBeNull()
  })
})
