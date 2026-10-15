/**
 * QUOI     — l'offre d'une enseigne telle que l'administration la lit : Pro, essai ou gratuit, et
 *            son détail en une ligne (« annuel », « 9 j restants », « offert jusqu’au 31 déc. »).
 * POURQUOI — la liste, la fiche d'une enseigne et celle d'une personne disent la même chose ; le Pro
 *            suit lib/plan.ts, l'essai l'état Stripe `trialing`.
 * ATTENTION — le même découpage vit en SQL (admin_offre) pour les filtres : les deux vont ensemble.
 */
import { daysUntil, formatDayMonthShort } from './dates'
import { isPro } from './plan'

export interface OfferFields {
  plan: string | null
  comped_pro_until: string | null
  subscription_status: string | null
  billing_interval: string | null
  trial_end: string | null
  discount_label: string | null
}

export interface Offer {
  kind: 'pro' | 'essai' | 'gratuit'
  detail: string
  /** Un paiement refusé : la ligne se lit en brique. */
  alert: boolean
}

export function offerOf(e: OfferFields, now: Date): Offer {
  if (e.subscription_status === 'trialing') {
    const days = e.trial_end ? Math.max(0, daysUntil(new Date(e.trial_end), now)) : 0
    return { kind: 'essai', detail: `${days} j restants`, alert: false }
  }
  if (!isPro({ plan: e.plan, comped_pro_until: e.comped_pro_until, verified: null }, now)) {
    return { kind: 'gratuit', detail: '', alert: false }
  }
  if (e.subscription_status === 'past_due')
    return { kind: 'pro', detail: 'paiement refusé', alert: true }
  if (e.plan !== 'pro' && e.comped_pro_until) {
    return {
      kind: 'pro',
      detail: `offert jusqu’au ${formatDayMonthShort(new Date(e.comped_pro_until))}`,
      alert: false,
    }
  }
  const rhythm = e.billing_interval === 'year' ? 'annuel' : 'mensuel'
  return {
    kind: 'pro',
    detail: e.discount_label ? `${rhythm} · remise ${e.discount_label}` : rhythm,
    alert: false,
  }
}
