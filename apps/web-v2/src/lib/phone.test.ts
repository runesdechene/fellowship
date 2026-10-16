/**
 * QUOI     — tests de lib/phone.ts : la clé de comparaison d'un téléphone.
 * POURQUOI — elle doit donner la même clé que phone_key() en SQL, sinon le rapprochement ment.
 */
import { describe, expect, it } from 'vitest'
import { phoneKey } from './phone'

describe('phoneKey', () => {
  it('garde les chiffres et ramène l’indicatif français à 0', () => {
    expect(phoneKey('06 41 22 18 90')).toBe('0641221890')
    expect(phoneKey('+33 6 41 22 18 90')).toBe('0641221890')
    expect(phoneKey('0033641221890')).toBe('0641221890')
    expect(phoneKey('06.41.22.18.90')).toBe('0641221890')
  })
  it('un numéro étranger reste tel quel, en chiffres', () => {
    expect(phoneKey('+41 79 123 45 67')).toBe('41791234567')
  })
  it('rien à comparer : null', () => {
    expect(phoneKey('')).toBeNull()
    expect(phoneKey(null)).toBeNull()
    expect(phoneKey('pas de numéro')).toBeNull()
  })
})
