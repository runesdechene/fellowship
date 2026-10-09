/**
 * QUOI     — tests de lib/editions.ts : quel festival semblable peut être l'édition précédente.
 * POURQUOI — seul un festival déjà passé peut être « l'édition d'avant » de celui qu'on ajoute.
 */
import { describe, expect, it } from 'vitest'
import { canBePreviousEdition } from './editions'

const today = new Date(2026, 9, 9)

describe('canBePreviousEdition', () => {
  it('un festival déjà passé peut l’être', () => {
    expect(canBePreviousEdition('2026-06-25', today)).toBe(true)
  })
  it('un festival à venir, ou aujourd’hui, ne le peut pas', () => {
    expect(canBePreviousEdition('2026-10-09', today)).toBe(false)
    expect(canBePreviousEdition('2027-06-25', today)).toBe(false)
  })
})
