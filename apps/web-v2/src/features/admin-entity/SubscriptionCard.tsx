/**
 * QUOI     — le bloc Abonnement : offre et prix, prochain renouvellement, qui paie, puis parrainage,
 *            mois offerts, remise et ambassadeur.
 * POURQUOI — l'administrateur lit l'état exact de l'offre ; les prix viennent de lib/pricing.ts.
 *            Dessous, ses gestes : offrir des mois, nommer ou retirer un ambassadeur, poser une
 *            remise. `reload` relit la fiche après chaque geste.
 */
import { useState } from 'react'
import { CreditCard, Gift, Percent, Star } from 'lucide-react'
import { AdminCard } from '@/components/ui/AdminCard'
import { Button } from '@/components/ui/Button'
import { formatFullDate } from '@/lib/dates'
import { formatPrice } from '@/lib/money'
import { offerOf, type Offer } from '@/lib/offer'
import { billingAction } from '@/lib/plan'
import { PRICES } from '@/lib/pricing'
import { renewalAhead } from '@/lib/renewal'
import { supabase } from '@/lib/supabase'
import { SheetRow } from '@/components/ui/SheetRow'
import { DiscountPicker } from './DiscountPicker'
import { GiftMonths } from './GiftMonths'
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
  /** L'e-mail du client Stripe : « Payée par » s'en sert quand aucun compte n'est relié. */
  customerEmail: string | null
  reload: () => void
}

export function SubscriptionCard({ entity, ownerId, customerEmail, reload }: Props) {
  const [giving, setGiving] = useState(false)
  const [discounting, setDiscounting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const now = new Date()
  const offer = offerOf(entity, now)
  const { title, price } = offerTitle(entity, offer)
  const next = renewal(entity, now)
  const gifted = offer.kind === 'pro' && entity.plan !== 'pro'
  const subscribed = billingAction(entity) === 'portal'
  const owns = entity.paid_by_user === ownerId
  const paidBy = entity.paid_by_name
    ? `${entity.paid_by_name}${owns ? ' (propriétaire)' : ''}`
    : (customerEmail ?? NONE)

  async function setAmbassador(yes: boolean) {
    if (busy) return
    setBusy(true)
    setError(null)
    const { error: failure } = await supabase.rpc('admin_ambassadeur', {
      p_entity: entity.actor_id,
      p_oui: yes,
    })
    setBusy(false)
    setConfirming(false)
    if (failure) setError(failure.message)
    else reload()
  }

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
      <div className="sheet-actions">
        <button
          type="button"
          className="sheet-actions__button"
          aria-expanded={giving}
          onClick={() => setGiving((open) => !open)}
        >
          <Gift size={16} aria-hidden /> Offrir des mois
        </button>
        <button
          type="button"
          className="sheet-actions__button"
          disabled={!subscribed}
          title={subscribed ? undefined : 'Pas d’abonnement Stripe en cours'}
          aria-expanded={discounting}
          onClick={() => setDiscounting((open) => !open)}
        >
          <Percent size={16} aria-hidden /> Poser une remise
        </button>
        {confirming ? (
          <span className="sheet-actions__confirm">
            Retirer le statut d’ambassadeur ?
            <Button onClick={() => void setAmbassador(false)} disabled={busy}>
              Retirer
            </Button>
            <Button variant="bare" onClick={() => setConfirming(false)} disabled={busy}>
              Annuler
            </Button>
          </span>
        ) : (
          <button
            type="button"
            className="sheet-actions__button"
            disabled={busy}
            onClick={() => (entity.is_ambassador ? setConfirming(true) : void setAmbassador(true))}
          >
            <Star size={16} aria-hidden />
            {entity.is_ambassador ? ' Retirer ambassadeur' : ' Passer ambassadeur'}
          </button>
        )}
      </div>
      {error && (
        <p className="sheet-form__error" role="alert">
          {error}
        </p>
      )}
      {giving && (
        <GiftMonths
          entity={entity}
          onClose={() => setGiving(false)}
          onGifted={() => {
            setGiving(false)
            reload()
          }}
        />
      )}
      {discounting && subscribed && (
        <DiscountPicker
          entityId={entity.actor_id}
          onClose={() => setDiscounting(false)}
          onApplied={() => {
            setDiscounting(false)
            reload()
          }}
        />
      )}
    </AdminCard>
  )
}
