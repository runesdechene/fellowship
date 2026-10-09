/**
 * QUOI     — tests de lib/pricing.ts : la formule, l'économie annuelle, les libellés de la carte Pro.
 * POURQUOI — les prix affichés doivent être ceux que Stripe facture.
 */
import { describe, expect, it } from 'vitest'
import { annualSaving, billingInterval, formulaFrom, proPriceLines } from './pricing'

describe('formulaFrom', () => {
  it('annuel par défaut, et pour une valeur inconnue', () => {
    expect(formulaFrom(null)).toBe('annuel')
    expect(formulaFrom('n-importe')).toBe('annuel')
    expect(formulaFrom('mensuel')).toBe('mensuel')
  })
})

describe('annualSaving', () => {
  it('l’annuel coûte 17 % de moins que douze mensualités', () => {
    expect(annualSaving()).toBe(17)
  })
})

describe('proPriceLines', () => {
  it('en annuel : l’équivalent mensuel, et le détail facturé', () => {
    expect(proPriceLines('annuel')).toEqual({
      big: '9,99 €',
      unit: 'HT / mois',
      note: 'Facturé 119,88 € HT par an · ou 11,99 € HT en mensuel',
    })
  })
  it('en mensuel : le prix du mois, et l’annuel en regard', () => {
    expect(proPriceLines('mensuel')).toEqual({
      big: '11,99 €',
      unit: 'HT / mois',
      note: 'ou 9,99 € HT par mois en annuel',
    })
  })
})

describe('billingInterval', () => {
  it('traduit la formule pour Stripe', () => {
    expect(billingInterval('annuel')).toBe('year')
    expect(billingInterval('mensuel')).toBe('month')
  })
})
