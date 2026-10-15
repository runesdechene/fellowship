/**
 * QUOI     — tests de lib/renewal.ts : la ligne sous le prochain renouvellement.
 * POURQUOI — une période échue ne doit pas se lire « dans 0 j ».
 */
import { describe, expect, it } from 'vitest'
import { renewalAhead } from './renewal'

const now = new Date(2026, 9, 15, 12)

describe('renewalAhead', () => {
  it('une fin de période passée est échue', () => {
    expect(renewalAhead(new Date(2026, 8, 11), now)).toBe('échu il y a 34 j')
  })
  it('à venir sous deux mois, en jours', () => {
    expect(renewalAhead(new Date(2026, 9, 25), now)).toBe('dans 10 j')
  })
  it('à venir au-delà, en mois calendaires', () => {
    expect(renewalAhead(new Date(2027, 2, 15), now)).toBe('dans 5 mois')
    expect(renewalAhead(new Date(2027, 2, 14), now)).toBe('dans 4 mois')
  })
})
