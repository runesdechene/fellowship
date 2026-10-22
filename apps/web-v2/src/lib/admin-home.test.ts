/**
 * QUOI     — tests de lib/admin-home.ts : le titre de l'accueil, la ligne sous le titre, les accords.
 * POURQUOI — la logique pure se teste ici, sans navigateur (méthode du dépôt : .claude/rules/dev.md).
 */
import { describe, expect, it } from 'vitest'
import { counted, visitorsHeadline, visitorsLine } from './admin-home'

describe('visitorsHeadline', () => {
  it('accorde le titre au nombre de visiteurs', () => {
    expect(visitorsHeadline(0)).toBe('Personne n’est venu cette semaine.')
    expect(visitorsHeadline(1)).toBe('Une personne est venue cette semaine.')
    expect(visitorsHeadline(8)).toBe('8 personnes sont venues cette semaine.')
  })
})

describe('visitorsLine', () => {
  it('commence par le jour, en majuscule', () => {
    expect(visitorsLine(new Date('2026-10-22T15:00:00'), 3, 21)).toBe(
      'Jeudi 22 octobre. 3 aujourd’hui, 21 sur les 30 derniers jours.',
    )
  })
})

describe('counted', () => {
  it('met le nom au pluriel au-delà de un', () => {
    expect(counted(0, 'fiche créée', 'fiches créées')).toBe('0 fiche créée')
    expect(counted(1, 'fiche créée', 'fiches créées')).toBe('1 fiche créée')
    expect(counted(3, 'fiche créée', 'fiches créées')).toBe('3 fiches créées')
  })
})
