// Client Stripe pour le frontend : invoque les 2 edge functions et redirige
// le navigateur vers l'URL renvoyée. Aucune clé Stripe ne transite côté client —
// les sessions Checkout / Portal sont créées server-side.
//
// Spec : docs/superpowers/specs/2026-05-28-stripe-mvp-design.md §4.

import { supabase } from './supabase'

export type BillingInterval = 'month' | 'year'

interface CheckoutResponse {
  url?: string
  error?: string
  portal?: boolean
  reason?: string
  message?: string
}

export interface BillingInfo { legalName: string; siren: string | null; noSiren: boolean }

/** Démarre Stripe Checkout. Si l'entité est déjà abonnée, redirige vers le portail. */
export async function startCheckout(
  entityId: string,
  billingInterval: BillingInterval,
  billing?: BillingInfo,
): Promise<void> {
  const { data, error } = await supabase.functions.invoke<CheckoutResponse>(
    'stripe-checkout-session',
    { body: { entityId, billingInterval, ...(billing ?? {}) } },
  )
  if (error) throw new Error(error.message || 'checkout_failed')
  if (!data) throw new Error('empty_response')
  // Cas "déjà abonné" : edge function renvoie 200 + portal=true pour signaler le pivot.
  if (data.portal) {
    return openCustomerPortal(entityId)
  }
  if (!data.url) throw new Error(data.error || 'checkout_failed')
  window.location.href = data.url
}

/** Ouvre le Customer Portal Stripe (factures, CB, résiliation, changement de plan). */
export async function openCustomerPortal(entityId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke<CheckoutResponse>(
    'stripe-portal-link',
    { body: { entityId } },
  )
  if (error) throw new Error(error.message || 'portal_failed')
  if (!data?.url) throw new Error(data?.error || 'portal_failed')
  window.location.href = data.url
}

/** Persiste raison sociale + SIREN et synchronise le Customer Stripe (édition hors checkout). */
export async function updateBillingInfo(entityId: string, billing: BillingInfo): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
    'stripe-update-billing',
    { body: { entityId, ...billing } },
  )
  if (error) throw new Error(error.message || 'update_billing_failed')
  if (!data?.ok) throw new Error(data?.error || 'update_billing_failed')
}
