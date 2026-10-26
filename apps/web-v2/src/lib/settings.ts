/**
 * QUOI     — les règles des Réglages : les champs du profil (validation, valeur à écrire), la
 *            phrase d'une enseigne, sa pastille de paiement et son geste de facturation, le mot qui
 *            confirme la suppression.
 * POURQUOI — lot 9b, maquette 2206:691. Les écrans affichent ; ce qui se décide se teste ici.
 * ATTENTION — l'ordre de la phrase compte : un paiement échoué, puis un arrêt programmé, puis un
 *            code promo qui couvre la facture passent avant « renouvelé le », qui serait faux.
 */
import { daysUntil, formatDayMonthShort, formatFullDate } from './dates'
import { isPro, SUBSCRIBED, SUSPENDED } from './plan'

export type ProfileField = 'display_name' | 'city' | 'postal_code'

const MAX_TEXT = 60

export function profileProblem(field: ProfileField, value: string): string | null {
  const trimmed = value.trim()
  if (field === 'display_name' && trimmed === '') return 'Ton nom ne peut pas être vide'
  if (field === 'postal_code')
    return trimmed === '' || /^\d{5}$/.test(trimmed) ? null : 'Cinq chiffres'
  return trimmed.length > MAX_TEXT ? `${String(MAX_TEXT)} caractères au plus` : null
}

export function cleanProfileValue(field: ProfileField, value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' && field !== 'display_name' ? null : trimmed
}

export const SEX_OPTIONS = [
  { value: 'indefini', label: 'Non précisé' },
  { value: 'femme', label: 'Femme' },
  { value: 'homme', label: 'Homme' },
] as const

export interface EntityBilling {
  plan: string | null
  comped_pro_until: string | null
  verified: boolean | null
  subscription_status: string | null
  billing_interval: string | null
  current_period_end: string | null
  trial_end: string | null
  legal_name: string | null
  discount_end: string | null
  discount_label: string | null
  cancel_at: string | null
}

function datesLabel(count: number): string {
  if (count === 0) return 'aucune date'
  return count === 1 ? '1 date' : `${String(count)} dates`
}

/** Ce qu'il reste de l'essai gratuit, en jours. */
function trialLabel(daysLeft: number): string {
  if (daysLeft <= 0) return 'Dernier jour d’essai'
  return daysLeft === 1 ? 'Encore 1 jour d’essai' : `Encore ${String(daysLeft)} jours d’essai`
}

/** L'état du paiement d'une enseigne, dit par sa pastille (maquette 2558:233). */
export type PaymentState = 'paid' | 'refused' | 'trial' | 'ending' | 'suspended'

export interface EntityLine {
  text: string
  action: 'portal' | 'upgrade' | 'none'
  pro: boolean
  /** null : rien à payer (gratuit, ou Pro offert). */
  status: { state: PaymentState; label: string } | null
}

/** La phrase d'une enseigne dans « Enseignes et abonnement », sa pastille et son bouton. */
export function entityLine(
  entity: EntityBilling,
  now: Date,
  /** null : le compte n'a pas pu être lu — la phrase ne dit alors rien du nombre. */
  upcomingDates: number | null,
): EntityLine {
  const subscribed =
    entity.subscription_status !== null && SUBSCRIBED.includes(entity.subscription_status)
  if (subscribed) {
    const parts = [entity.billing_interval === 'year' ? 'Pro annuel' : 'Pro mensuel']
    let status: EntityLine['status'] = { state: 'paid', label: 'À jour' }
    if (entity.subscription_status === 'past_due') {
      status = { state: 'refused', label: 'Paiement refusé' }
      parts.push('mets ta carte à jour')
    } else if (entity.cancel_at) {
      status = {
        state: 'ending',
        label: `S’arrête le ${formatDayMonthShort(new Date(entity.cancel_at))}`,
      }
      parts.push('tu as résilié, la vitrine reste Pro jusque-là')
    } else if (entity.discount_end && new Date(entity.discount_end) > now)
      parts.push(
        `offert jusqu’au ${formatFullDate(new Date(entity.discount_end))}` +
          (entity.discount_label ? ` (${entity.discount_label})` : ''),
      )
    else if (entity.subscription_status === 'trialing' && entity.trial_end) {
      const trialEnd = new Date(entity.trial_end)
      status = { state: 'trial', label: trialLabel(daysUntil(trialEnd, now)) }
      parts.push(`essai jusqu’au ${formatFullDate(trialEnd)}`)
    } else if (entity.current_period_end)
      parts.push(`renouvelé le ${formatFullDate(new Date(entity.current_period_end))}`)
    if (entity.legal_name) parts.push(`facture au nom de ${entity.legal_name}`)
    return { text: parts.join(' · '), action: 'portal', pro: true, status }
  }
  if (isPro(entity, now)) {
    // Pro sans abonnement en cours : offert jusqu'à une date, ou accordé par Fellowship.
    const text = entity.comped_pro_until
      ? `Pro offert jusqu’au ${formatFullDate(new Date(entity.comped_pro_until))}`
      : 'Pro'
    return { text, action: 'none', pro: true, status: null }
  }
  if (entity.subscription_status !== null && SUSPENDED.includes(entity.subscription_status))
    return {
      text: 'Le paiement n’a pas abouti : la vitrine est repassée en gratuit',
      action: 'upgrade',
      pro: false,
      status: { state: 'suspended', label: 'Pro suspendu' },
    }
  return {
    text:
      upcomingDates === null
        ? 'Gratuit'
        : `Gratuit · ${datesLabel(upcomingDates)} sur tes 6 prochains mois`,
    action: 'upgrade',
    pro: false,
    status: null,
  }
}

/** Ce que l'aperçu dit d'une enseigne partagée qui reste : son abonnement s'arrête en fin de
 *  période (Uriel, 11/10/2026) — personne n'est prélevé après son départ. */
export function keptNote(endsOn: string | null): string {
  return endsOn ? ` — son abonnement Pro s’arrête le ${formatFullDate(new Date(endsOn))}` : ''
}

export function confirmsDeletion(typed: string): boolean {
  return typed.trim() === 'SUPPRIMER'
}
