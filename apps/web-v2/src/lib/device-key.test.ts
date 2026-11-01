/**
 * QUOI     — tests du code de l'appareil : sa forme, et les essais qui restent.
 * POURQUOI — au 5ᵉ code faux, l'appareil oublie la clé : un essai de trop ou de moins se paie.
 */
import { describe, expect, test } from 'vitest'
import { isPin, triesLeft } from './device-key'

describe('isPin', () => {
  test('quatre chiffres, rien d’autre', () => {
    expect(isPin('0427')).toBe(true)
    expect(isPin('427')).toBe(false)
    expect(isPin('04271')).toBe(false)
    expect(isPin('04a7')).toBe(false)
  })
})

describe('triesLeft', () => {
  test('cinq essais, puis l’appareil oublie la clé', () => {
    expect(triesLeft(1)).toBe(4)
    expect(triesLeft(4)).toBe(1)
    expect(triesLeft(5)).toBe(0)
    expect(triesLeft(9)).toBe(0)
  })
})
