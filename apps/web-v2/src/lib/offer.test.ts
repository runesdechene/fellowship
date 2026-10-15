/**
 * QUOI     — tests de lib/offer.ts : l'offre d'une enseigne vue par l'administration.
 * POURQUOI — la liste et les deux fiches la lisent ; le découpage doit coller à admin_offre (SQL).
 */
import { describe, expect, it } from 'vitest'
import { formatDayMonthShort } from './dates'
import { offerOf, type OfferFields } from './offer'

const now = new Date(2026, 9, 15, 12)
const base: OfferFields = {
  plan: 'free',
  comped_pro_until: null,
  subscription_status: null,
  billing_interval: null,
  trial_end: null,
  discount_label: null,
}

describe('offerOf', () => {
  it('sans rien, gratuit', () => {
    expect(offerOf(base, now)).toEqual({ kind: 'gratuit', detail: '', alert: false })
  })
  it('un essai Stripe compte ses jours, même si plan vaut pro', () => {
    const o = offerOf(
      { ...base, plan: 'pro', subscription_status: 'trialing', trial_end: '2026-10-24T12:00:00Z' },
      now,
    )
    expect(o.kind).toBe('essai')
    expect(o.detail).toBe('9 j restants')
  })
  it('un abonnement annuel', () => {
    expect(
      offerOf(
        { ...base, plan: 'pro', subscription_status: 'active', billing_interval: 'year' },
        now,
      ),
    ).toEqual({ kind: 'pro', detail: 'annuel', alert: false })
  })
  it('un abonnement mensuel avec remise', () => {
    expect(
      offerOf(
        {
          ...base,
          plan: 'pro',
          subscription_status: 'active',
          billing_interval: 'month',
          discount_label: 'RUNE-2026',
        },
        now,
      ).detail,
    ).toBe('mensuel · remise RUNE-2026')
  })
  it('un paiement refusé alerte', () => {
    expect(
      offerOf(
        { ...base, plan: 'pro', subscription_status: 'past_due', billing_interval: 'month' },
        now,
      ),
    ).toEqual({ kind: 'pro', detail: 'paiement refusé', alert: true })
  })
  it('un Pro offert dit jusqu’à quand', () => {
    const until = '2026-12-31T00:00:00Z'
    expect(offerOf({ ...base, comped_pro_until: until }, now).detail).toBe(
      `offert jusqu’au ${formatDayMonthShort(new Date(until))}`,
    )
  })
  it('un Pro offert échu redevient gratuit', () => {
    expect(offerOf({ ...base, comped_pro_until: '2026-01-01T00:00:00Z' }, now).kind).toBe('gratuit')
  })
})
