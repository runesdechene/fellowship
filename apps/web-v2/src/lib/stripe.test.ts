/**
 * QUOI     — tests de lib/stripe.ts : que faire de la réponse du paiement, quand cesser de relire.
 * POURQUOI — un abonné déjà en cours ouvre son espace de gestion ; le retour de Stripe ne boucle
 *            jamais.
 */
import { describe, expect, it } from 'vitest'
import { checkoutOutcome, nextPoll } from './stripe'

describe('checkoutOutcome', () => {
  it('une adresse : on part vers Stripe', () => {
    expect(checkoutOutcome({ url: 'https://checkout.stripe.com/x' })).toEqual({
      kind: 'redirect',
      url: 'https://checkout.stripe.com/x',
    })
  })
  it('déjà abonné : l’espace de gestion', () => {
    expect(checkoutOutcome({ portal: true })).toEqual({ kind: 'portal' })
  })
  it('rien d’exploitable : une erreur', () => {
    expect(checkoutOutcome(null)).toEqual({ kind: 'error' })
    expect(checkoutOutcome({ error: 'x' })).toEqual({ kind: 'error' })
  })
})

describe('nextPoll', () => {
  it('s’arrête dès que le Pro est là', () => {
    expect(nextPoll(1, true)).toBe('stop-pro')
  })
  it('relit tant qu’il reste des essais', () => {
    expect(nextPoll(7, false)).toBe('wait')
  })
  it('s’arrête au huitième essai, sans boucler', () => {
    expect(nextPoll(8, false)).toBe('stop-late')
  })
})
