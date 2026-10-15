/**
 * QUOI     — l'offre d'une enseigne en une ligne : la pastille Pro ou Essai, puis le détail.
 * POURQUOI — même lecture dans la liste et les fiches ; le calcul vit dans lib/offer.ts.
 */
import type { Offer } from '@/lib/offer'
import { ProBadge } from './ProBadge'

export function OfferBadge({ offer }: { offer: Offer }) {
  if (offer.kind === 'gratuit') return <span className="offer-badge__detail">Gratuit</span>
  return (
    <span className="offer-badge">
      {offer.kind === 'pro' ? <ProBadge /> : <span className="offer-badge__trial">Essai</span>}
      {offer.detail && (
        <span
          className={
            offer.alert ? 'offer-badge__detail offer-badge__detail--alert' : 'offer-badge__detail'
          }
        >
          {offer.detail}
        </span>
      )}
    </span>
  )
}
