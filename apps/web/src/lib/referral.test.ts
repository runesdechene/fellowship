import { describe, it, expect } from 'vitest'
import { normalizeReferralCode, monthlyCreditCents, isAmbassador, referralLink } from './referral'

describe('normalizeReferralCode', () => {
  it('majuscule, retire accents et non-alphanum', () => {
    expect(normalizeReferralCode('Rune de Chêne')).toBe('RUNEDECHENE')
    expect(normalizeReferralCode('  l’Atelier #1 ')).toBe('LATELIER1')
  })
  it('tronque à 20 caractères', () => {
    expect(normalizeReferralCode('A'.repeat(30))).toBe('A'.repeat(20))
  })
})

describe('monthlyCreditCents', () => {
  it('mensuel = montant tel quel', () => {
    expect(monthlyCreditCents(1199, 'month')).toBe(1199)
  })
  it('annuel = montant / 12 arrondi', () => {
    expect(monthlyCreditCents(11988, 'year')).toBe(999)
  })
  it('0 ou négatif = 0', () => {
    expect(monthlyCreditCents(0, 'month')).toBe(0)
    expect(monthlyCreditCents(-5, 'year')).toBe(0)
  })
})

describe('isAmbassador', () => {
  it('true seulement si is_ambassador === true', () => {
    expect(isAmbassador({ is_ambassador: true })).toBe(true)
    expect(isAmbassador({ is_ambassador: false })).toBe(false)
    expect(isAmbassador({})).toBe(false)
    expect(isAmbassador(null)).toBe(false)
  })
})

describe('referralLink', () => {
  it('construit le lien ?r=', () => {
    expect(referralLink('https://flwsh.app', 'RUNEDECHENE')).toBe('https://flwsh.app/?r=RUNEDECHENE')
    expect(referralLink('https://flwsh.app/', 'ABC')).toBe('https://flwsh.app/?r=ABC')
  })
})
