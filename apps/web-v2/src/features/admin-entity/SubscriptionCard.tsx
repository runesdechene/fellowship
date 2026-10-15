/**
 * QUOI     — le bloc Abonnement : offre et prix, prochain renouvellement, qui paie, puis parrainage,
 *            mois offerts, remise et ambassadeur.
 * POURQUOI — l'administrateur lit l'état exact de l'offre ; les prix viennent de lib/pricing.ts.
 *            Les boutons d'action (offrir, remise, ambassadeur) et le repli sur l'e-mail du client
 *            Stripe arrivent plus tard.
 */
import { CreditCard } from 'lucide-react'
import { AdminCard } from '@/components/ui/AdminCard'
import { formatFullDate } from '@/lib/dates'
import { formatPrice } from '@/lib/money'
import { offerOf, type Offer } from '@/lib/offer'
import { PRICES } from '@/lib/pricing'
import { renewalAhead } from '@/lib/renewal'
import { SheetRow } from '@/components/ui/SheetRow'
import type { EntityFields } from './useAdminEntity'

const NONE = '—'

function offerTitle(entity: EntityFields, offer: Offer): { title: string; price: string } {
  if (offer.kind === 'essai') return { title: 'Essai', price: offer.detail }
  if (offer.kind === 'gratuit') return { title: 'Gratuit', price: NONE }
  if (entity.plan !== 'pro') return { title: 'Pro offert', price: NONE }
  if (entity.billing_interval === 'year') {
    return { title: 'Pro annuel', price: `${formatPrice(PRICES.yearly)} HT / an` }
  }
  return { title: 'Pro mensuel', price: `${formatPrice(PRICES.monthly)} HT / mois` }
}

function renewal(entity: EntityFields, now: Date): { date: string; ahead: string } {
  if (!entity.current_period_end) return { date: NONE, ahead: '' }
  const end = new Date(entity.current_period_end)
  return { date: formatFullDate(end), ahead: renewalAhead(end, now) }
}

function sponsorship(entity: EntityFields): string {
  const parts = []
  if (entity.parrain_nom) parts.push(`Parrainée par ${entity.parrain_nom}`)
  if (entity.filleuls > 0) parts.push(`a parrainé ${entity.filleuls} enseignes`)
  return parts.length > 0 ? parts.join(' · ') : NONE
}

function discountLine(entity: EntityFields): string {
  if (!entity.discount_label) return 'Aucune'
  if (!entity.discount_end) return entity.discount_label
  return `${entity.discount_label} jusqu’au ${formatFullDate(new Date(entity.discount_end))}`
}

interface Props {
  entity: EntityFields
  ownerId: string | null
}

export function SubscriptionCard({ entity, ownerId }: Props) {
  const now = new Date()
  const offer = offerOf(entity, now)
  const { title, price } = offerTitle(entity, offer)
  const next = renewal(entity, now)
  const gifted = offer.kind === 'pro' && entity.plan !== 'pro'
  const owns = entity.paid_by_user === ownerId
  const paidBy = entity.paid_by_name
    ? `${entity.paid_by_name}${owns ? ' (propriétaire)' : ''}`
    : NONE

  return (
    <AdminCard
      title="Abonnement"
      Icon={CreditCard}
      tone="terre"
      action={
        entity.stripe_customer_id && (
          <a
            className="sheet-link"
            href={`https://dashboard.stripe.com/customers/${entity.stripe_customer_id}`}
            target="_blank"
            rel="noreferrer"
          >
            Ouvrir dans Stripe ↗
          </a>
        )
      }
    >
      <div className="sheet-summary">
        <div className="sheet-summary__cell">
          <span className="sheet-summary__label">Offre</span>
          <span className="sheet-summary__value">{title}</span>
          <span className="sheet-summary__note">{price}</span>
        </div>
        <div className="sheet-summary__cell">
          <span className="sheet-summary__label">Prochain renouvellement</span>
          <span className="sheet-summary__value">{next.date}</span>
          <span className="sheet-summary__note">{next.ahead}</span>
        </div>
        <div className="sheet-summary__cell">
          <span className="sheet-summary__label">Payée par</span>
          <span className="sheet-summary__value">{paidBy}</span>
        </div>
      </div>
      <dl className="sheet-rows">
        <SheetRow label="Parrainage">{sponsorship(entity)}</SheetRow>
        <SheetRow label="Mois offerts">{gifted ? offer.detail : 'Aucun en cours'}</SheetRow>
        <SheetRow label="Remise">{discountLine(entity)}</SheetRow>
        <SheetRow label="Ambassadeur">{entity.is_ambassador ? 'Oui' : 'Non'}</SheetRow>
      </dl>
    </AdminCard>
  )
}
