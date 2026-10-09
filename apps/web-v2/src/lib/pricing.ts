/**
 * QUOI     — les prix du Pro et ce que la page de l'offre en dit.
 * POURQUOI — un seul endroit : le changement de prix (9,99 € HT / 99,90 € HT, après la V2) ne
 *            touchera que ce fichier, en même temps que Stripe.
 * ATTENTION — ces montants DOIVENT être ceux que Stripe facture (prix STRIPE_PRICE_MONTHLY et
 *            STRIPE_PRICE_YEARLY des fonctions serveur) : afficher un prix et en facturer un autre
 *            est le pire des bugs.
 */
import { formatPrice } from './money'

export type Formula = 'annuel' | 'mensuel'

/** En centimes HT. */
export const PRICES = { monthly: 1199, yearly: 11988 } as const

export function formulaFrom(raw: string | null): Formula {
  return raw === 'mensuel' ? 'mensuel' : 'annuel'
}

/** L'économie de l'annuel sur douze mensualités, en pourcentage arrondi. */
export function annualSaving(): number {
  return Math.round((1 - PRICES.yearly / (PRICES.monthly * 12)) * 100)
}

export function proPriceLines(formula: Formula): { big: string; unit: string; note: string } {
  const perMonthYearly = Math.round(PRICES.yearly / 12)
  if (formula === 'annuel') {
    return {
      big: formatPrice(perMonthYearly),
      unit: 'HT / mois',
      note: `Facturé ${formatPrice(PRICES.yearly)} HT par an · ou ${formatPrice(PRICES.monthly)} HT en mensuel`,
    }
  }
  return {
    big: formatPrice(PRICES.monthly),
    unit: 'HT / mois',
    note: `ou ${formatPrice(perMonthYearly)} HT par mois en annuel`,
  }
}

export function billingInterval(formula: Formula): 'month' | 'year' {
  return formula === 'annuel' ? 'year' : 'month'
}
