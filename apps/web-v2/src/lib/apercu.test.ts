/**
 * QUOI     — tests de lib/apercu.ts : ce qu'une fiche sans compte dit de qui y va.
 * POURQUOI — le nombre et le « +N » des visages se calculent ici,
 *            sans navigateur (.claude/rules/dev.md).
 */
import { goingCount, hiddenFaces, moreReviewsLink } from './apercu'

describe('goingCount', () => {
  it('compte ceux qui y vont, au singulier comme au pluriel', () => {
    expect(goingCount(12)).toBe('12 exposants y vont')
    expect(goingCount(1)).toBe('1 exposant y va')
  })

  it('personne : rien à dire', () => {
    expect(goingCount(0)).toBeNull()
  })
})

describe('hiddenFaces', () => {
  it('ceux qu’on ne voit pas, derrière le « +N »', () => {
    expect(hiddenFaces(12, 6)).toBe(6)
    expect(hiddenFaces(4, 4)).toBe(0)
    expect(hiddenFaces(3, 6)).toBe(0)
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
