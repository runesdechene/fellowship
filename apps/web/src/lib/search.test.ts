import { describe, it, expect } from 'vitest'
import { isSearchableActor } from './search'

describe('isSearchableActor', () => {
  it('entité (exposant) → visible dans la recherche', () => expect(isSearchableActor('entity')).toBe(true))
  it('personne (festivalier) → exclue (pas de vitrine accessible)', () => expect(isSearchableActor('person')).toBe(false))
  it('valeur nulle/inconnue → exclue', () => {
    expect(isSearchableActor(null)).toBe(false)
    expect(isSearchableActor(undefined)).toBe(false)
    expect(isSearchableActor('')).toBe(false)
  })
})
