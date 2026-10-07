import { describe, it, expect } from 'vitest'
import { normalizeSex, USER_SEX_VALUES } from './user-sex'

describe('normalizeSex', () => {
  it('garde homme / femme', () => {
    expect(normalizeSex('homme')).toBe('homme')
    expect(normalizeSex('femme')).toBe('femme')
  })
  it('ramène le label SANS accent (bug 400 : `indéfini` accentué n’est pas dans l’enum)', () => {
    expect(normalizeSex('indéfini')).toBe('indefini')
    expect(normalizeSex('indefini')).toBe('indefini')
  })
  it('null / vide / inconnu → indefini', () => {
    expect(normalizeSex(null)).toBe('indefini')
    expect(normalizeSex(undefined)).toBe('indefini')
    expect(normalizeSex('')).toBe('indefini')
    expect(normalizeSex('autre')).toBe('indefini')
  })
  it('ne renvoie JAMAIS une valeur hors de l’enum user_sex', () => {
    for (const input of ['homme', 'femme', 'indéfini', 'X', '', null, undefined]) {
      expect(USER_SEX_VALUES).toContain(normalizeSex(input))
    }
  })
})
