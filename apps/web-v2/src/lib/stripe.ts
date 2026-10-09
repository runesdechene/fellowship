/**
 * QUOI     — ouvrir le paiement Stripe ou l'espace de gestion de l'abonnement, depuis la V2.
 * POURQUOI — les fonctions serveur existent (stripe-checkout-session, stripe-portal-link) ;
 *            `returnTo: 'v2'` leur demande de ramener l'exposant sur /v2/pro.
 * ATTENTION — le statut Pro n'arrive en base que par le webhook, quelques secondes après le
 *            paiement : le retour relit l'identité, au plus MAX_POLLS fois (nextPoll).
 */
import { supabase } from './supabase'

export type CheckoutOutcome =
  { kind: 'redirect'; url: string } | { kind: 'portal' } | { kind: 'error' }

interface FunctionReply {
  url?: string
  portal?: boolean
  error?: string
}

/** La réponse de stripe-checkout-session : partir vers Stripe, ouvrir l'espace, ou échouer. */
export function checkoutOutcome(data: FunctionReply | null): CheckoutOutcome {
  if (data?.portal) return { kind: 'portal' }
  if (data?.url) return { kind: 'redirect', url: data.url }
  return { kind: 'error' }
}

const MAX_POLLS = 8
export const POLL_EVERY_MS = 2000

/** Après le paiement : arrêter (Pro arrivé), relire encore, ou abandonner sans boucler. */
export function nextPoll(attempt: number, pro: boolean): 'stop-pro' | 'wait' | 'stop-late' {
  if (pro) return 'stop-pro'
  return attempt >= MAX_POLLS ? 'stop-late' : 'wait'
}

export async function openPortal(entityId: string): Promise<void> {
  const response = await supabase.functions.invoke<FunctionReply>('stripe-portal-link', {
    body: { entityId, returnTo: 'v2' },
  })
  const url = response.error ? null : response.data?.url
  if (!url) throw new Error('portal')
  window.location.assign(url)
}

export async function startCheckout(entityId: string, interval: 'month' | 'year'): Promise<void> {
  const response = await supabase.functions.invoke<FunctionReply>('stripe-checkout-session', {
    body: { entityId, billingInterval: interval, returnTo: 'v2' },
  })
  if (response.error) throw new Error('checkout')
  const outcome = checkoutOutcome(response.data)
  if (outcome.kind === 'portal') return openPortal(entityId)
  if (outcome.kind === 'error') throw new Error('checkout')
  window.location.assign(outcome.url)
}
