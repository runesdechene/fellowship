import { describe, it, expect } from 'vitest'
import { validateSiren, billingFormReady } from './siren'

describe('validateSiren', () => {
  it('accepte un SIREN valide (Luhn) et le normalise', () => {
    // 552100554 = SIREN Renault (Luhn valide)
    expect(validateSiren('552 100 554')).toEqual({ valid: true, normalized: '552100554' })
    expect(validateSiren('404833048')).toEqual({ valid: true, normalized: '404833048' }) // Google France
  })
  it('refuse une longueur ≠ 9 chiffres', () => {
    expect(validateSiren('5521005')).toEqual({ valid: false, normalized: '5521005' })
    expect(validateSiren('5521005541')).toEqual({ valid: false, normalized: '5521005541' })
  })
  it('refuse une clé de Luhn invalide', () => {
    expect(validateSiren('123456789')).toEqual({ valid: false, normalized: '123456789' })
  })
  it('refuse vide / non numérique', () => {
    expect(validateSiren('')).toEqual({ valid: false, normalized: '' })
    expect(validateSiren('abcdefghi')).toEqual({ valid: false, normalized: '' })
  })
})

describe('billingFormReady', () => {
  it('prêt si raison sociale + SIREN valide', () => {
    expect(billingFormReady({ legalName: 'Rune de Chêne EI', siren: '552100554', noSiren: false })).toBe(true)
  })
  it('prêt si raison sociale + case « pas de SIREN »', () => {
    expect(billingFormReady({ legalName: 'Foreign Ltd', siren: '', noSiren: true })).toBe(true)
  })
  it('pas prêt si raison sociale vide', () => {
    expect(billingFormReady({ legalName: '  ', siren: '552100554', noSiren: false })).toBe(false)
  })
  it('pas prêt si SIREN invalide et case décochée', () => {
    expect(billingFormReady({ legalName: 'X', siren: '123456789', noSiren: false })).toBe(false)
  })

  // Mode checkout : la raison sociale est collectée par Stripe → on n'exige que le SIREN.
  describe('requireLegalName: false (modale checkout, SIREN seul)', () => {
    it('prêt si SIREN valide même sans raison sociale', () => {
      expect(billingFormReady({ legalName: '', siren: '552100554', noSiren: false }, { requireLegalName: false })).toBe(true)
    })
    it('prêt si « pas de SIREN » même sans raison sociale', () => {
      expect(billingFormReady({ legalName: '', siren: '', noSiren: true }, { requireLegalName: false })).toBe(true)
    })
    it('pas prêt si SIREN invalide', () => {
      expect(billingFormReady({ legalName: '', siren: '123456789', noSiren: false }, { requireLegalName: false })).toBe(false)
    })
  })
})
