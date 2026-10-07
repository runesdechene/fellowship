/**
 * QUOI     — les tests de lib/reviews.ts : la note affichée, les étoiles, la signature d'un avis.
 * POURQUOI — un avis à l'identité protégée qui laisserait voir son auteur trahirait la promesse
 *            faite aux exposants.
 */
import { describe, expect, it } from 'vitest'
import { formatScore, reviewSignature, starsOf } from './reviews'

describe('formatScore', () => {
  it('une décimale, virgule française', () => {
    expect(formatScore(4.333)).toBe('4,3')
    expect(formatScore(4)).toBe('4,0')
  })
})

describe('starsOf', () => {
  it('arrondit à l’étoile la plus proche, entre 0 et 5', () => {
    expect(starsOf(4.3)).toBe(4)
    expect(starsOf(4.5)).toBe(5)
    expect(starsOf(0.2)).toBe(0)
  })
})

describe('reviewSignature', () => {
  const at = '2025-08-02T10:00:00Z'

  it('identité protégée : « Un exposant, édition 2025 »', () => {
    expect(reviewSignature({ identityVisible: false, authorLabel: 'Gautier', createdAt: at })).toBe(
      'Un exposant, édition 2025',
    )
  })

  it('identité visible (ami, non anonyme) : son nom', () => {
    expect(reviewSignature({ identityVisible: true, authorLabel: 'Gautier', createdAt: at })).toBe(
      'Gautier, édition 2025',
    )
  })

  it('visible mais sans nom : on retombe sur l’anonyme', () => {
    expect(reviewSignature({ identityVisible: true, authorLabel: null, createdAt: at })).toBe(
      'Un exposant, édition 2025',
    )
  })
})
