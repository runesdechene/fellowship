/**
 * QUOI     — « Parraine un exposant » sur /pro : le code à dicter, le lien à copier, les filleuls.
 * POURQUOI — chantier 3 (19/10/2026) : le parrainage de la V1 revient dans la V2, sans maquette —
 *            composé des briques de la page (carte d'offre, boutons). Sur /pro parce que toutes les
 *            invitations du gratuit y mènent, et que le parrain gratuit est la première cible.
 * ATTENTION — deux gestes, deux canaux : le code se dit au stand, le lien s'envoie.
 */
import { Check, Copy, Link2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { referralLink, referralStats } from '@/lib/referral'
import { useReferral } from './useReferral'

export function ReferralCard({ entityId, brandName }: { entityId: string; brandName: string }) {
  const { referral, failed } = useReferral(entityId, brandName)
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)

  function copy(what: 'code' | 'link', text: string) {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(what)
      },
      () => undefined, // presse-papiers refusé : le code reste sélectionnable à la main
    )
  }

  return (
    <section className="plan-card referral-card">
      <div className="plan-card__head">
        <h2 className="plan-card__name">Parraine un exposant</h2>
        <span className="plan-card__note">Offre un mois, gagne un mois</span>
      </div>
      <p className="plan-card__hint">
        Ton filleul essaie le Pro 30 jours au lieu de 14. Tu gagnes un mois dès qu’il paie sa
        première facture.
      </p>
      {failed && (
        <p className="plan-card__hint">Ton code n’a pas pu se charger. Recharge la page.</p>
      )}
      {referral && (
        <>
          <div className="referral-card__row">
            <span className="plan-card__big">{referral.code}</span>
            <Button
              onClick={() => {
                copy('code', referral.code)
              }}
            >
              {copied === 'code' ? <Check size={15} /> : <Copy size={15} />}
              {copied === 'code' ? 'Copié' : 'Copier le code'}
            </Button>
            <Button
              onClick={() => {
                copy('link', referralLink(window.location.origin, referral.code))
              }}
            >
              {copied === 'link' ? <Check size={15} /> : <Link2 size={15} />}
              {copied === 'link' ? 'Lien copié' : 'Copier mon lien'}
            </Button>
          </div>
          <hr className="plan-card__rule" />
          <p className="plan-card__hint">
            {referralStats(referral.rewarded, referral.pending)}
            {referral.ambassador && ' · Ambassadeur Fellowship'}
          </p>
        </>
      )}
    </section>
  )
}
