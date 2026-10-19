/**
 * QUOI     — la bande « Ton dernier paiement a échoué » en tête du tableau de bord, et le bouton qui
 *            ouvre l'espace Stripe pour changer de carte.
 * POURQUOI — chantier 3 (19/10/2026) : Stripe retente le prélèvement, puis coupe le Pro ; l'exposant
 *            doit le voir là où il arrive. Même bande que celle du bilan (ActionBanner), sans maquette.
 * ATTENTION — elle ne se ferme pas : elle part d'elle-même quand le paiement passe.
 */
import { CreditCard } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { openPortal } from '@/lib/stripe'

export function PaymentBanner({ entityId }: { entityId: string }) {
  const [opening, setOpening] = useState(false)
  const [failed, setFailed] = useState(false)

  return (
    <div>
      <p className="action-banner__eyebrow">À régler</p>
      <div className="action-banner">
        <span className="action-banner__icon">
          <CreditCard size={20} strokeWidth={1.75} />
        </span>
        <div className="action-banner__body">
          <p className="action-banner__title">Ton dernier paiement a échoué</p>
          <p className="action-banner__note">
            {failed
              ? 'L’espace Stripe ne s’est pas ouvert. Réessaie.'
              : 'Mets à jour ta carte pour garder le Pro.'}
          </p>
        </div>
        <div className="action-banner__actions">
          <Button
            variant="action"
            disabled={opening}
            onClick={() => {
              setOpening(true)
              setFailed(false)
              openPortal(entityId).catch(() => {
                setOpening(false)
                setFailed(true)
              })
            }}
          >
            {opening ? 'Ouverture…' : 'Mettre à jour ma carte'}
          </Button>
        </div>
      </div>
    </div>
  )
}
