/**
 * QUOI     — les tests de lib/teaser.ts : la ligne de l'aperçu flouté d'une fiche vue sans compte.
 * POURQUOI — l'aperçu ne doit jamais annoncer ce qui n'existe pas (« 0 avis »).
 */
import { describe, expect, it } from 'vitest'
import { teaserLine } from './teaser'

describe('teaserLine', () => {
  it('les deux nombres, accordés', () => {
    expect(teaserLine(4, 7)).toBe('4 avis · 7 questions')
    expect(teaserLine(1, 1)).toBe('1 avis · 1 question')
  })
  it('une seule moitié quand l’autre est vide', () => {
    expect(teaserLine(3, 0)).toBe('3 avis')
    expect(teaserLine(0, 2)).toBe('2 questions')
  })
  it('rien du tout : pas d’aperçu', () => {
    expect(teaserLine(0, 0)).toBeNull()
  })
})
