/**
 * QUOI     — les deux cartes de l'offre : Gratuit et Pro, leur prix, leur bouton, leurs avantages.
 * POURQUOI — maquette « Offre Pro » : on compare d'un coup d'œil, le Pro porte le liseré terre.
 * ATTENTION — le prix vient de lib/pricing.ts (celui que Stripe facture). Le bouton ne se reclique
 *            pas pendant l'ouverture du paiement : un seul appel part.
 */
import { ArrowRight, Check } from 'lucide-react'
import { useState } from 'react'
import { formatFullDate } from '@/lib/dates'
import { billingInterval, proPriceLines, type Formula } from '@/lib/pricing'
import { openPortal, startCheckout } from '@/lib/stripe'

const FREE = [
  'L’Explorer sur tes 6 prochains mois',
  'Ton calendrier sur tes 6 prochains mois',
  'Tes amis, l’activité du réseau et la communauté',
  'La note globale, les avis et les questions sur chaque festival',
  'Ta vitrine, et son intégration sur ton site avec la mention Fellowship',
]

const PRO = [
  {
    title: 'Anticiper',
    items: [
      'Fouille l’Explorer et pose des dates sur toute l’année',
      'Un rappel avant chaque clôture de candidature',
      'Prévenu dès qu’un festival que tu as fait annonce sa nouvelle édition',
      'Tes recherches sauvegardées t’alertent des nouveaux festivals',
      'Les notes détaillées de chaque festival : affluence, organisation, rentabilité',
    ],
  },
  {
    title: 'Tenir le cap',
    items: ['Un objectif de chiffre d’affaires par festival', 'Tes bilans, visibles par toi seul'],
  },
  {
    title: 'Être reconnu',
    items: ['Le badge Certifié sur ta vitrine', 'L’intégration sans la marque, à tes couleurs'],
  },
]

function Advantages({ items }: { items: string[] }) {
  return (
    <ul className="plan-card__list">
      {items.map((item) => (
        <li key={item}>
          <Check size={15} strokeWidth={2} />
          {item}
        </li>
      ))}
    </ul>
  )
}

export function FreeCard({ current }: { current: boolean }) {
  return (
    <article className="plan-card">
      <div className="plan-card__head">
        <span className="plan-card__name">Gratuit</span>
        <span className="plan-card__price">
          <span className="plan-card__big">0 €</span>
          <span className="plan-card__unit">pour toujours</span>
        </span>
        <span className="plan-card__note">Sans carte bancaire</span>
      </div>
      {current && <span className="plan-card__current">Ton offre actuelle</span>}
      <hr className="plan-card__rule" />
      <Advantages items={FREE} />
    </article>
  )
}

interface ProCardProps {
  formula: Formula
  /** L'enseigne active est déjà Pro (payée, ou offerte par le parrainage). */
  pro: boolean
  /** null : compte personnel, le Pro vit sur une enseigne. */
  entityId: string | null
  /** S'abonner, gérer son abonnement Stripe, ou rien (lib/plan.ts, billingAction). */
  action: 'checkout' | 'portal' | 'none'
  /** Un Pro offert, sans abonnement : jusqu'à quand il court. */
  compedUntil: string | null
  /** Juste après un paiement, le temps que Stripe prévienne la base : on ne propose rien. */
  settling: boolean
}

function ctaLabel(action: ProCardProps['action'], pro: boolean): string {
  if (action === 'portal') return 'Gérer mon abonnement'
  return pro ? 'M’abonner' : 'Essayer 14 jours gratuitement'
}

export function ProCard({ formula, pro, entityId, action, compedUntil, settling }: ProCardProps) {
  const [opening, setOpening] = useState(false)
  const [failed, setFailed] = useState(false)
  const { big, unit, note } = proPriceLines(formula)

  function open() {
    if (!entityId || opening || settling || action === 'none') return
    setOpening(true)
    setFailed(false)
    const go =
      action === 'portal' ? openPortal(entityId) : startCheckout(entityId, billingInterval(formula))
    // En cas de succès, le navigateur part vers Stripe : on ne réactive le bouton qu'en cas d'échec.
    go.catch(() => {
      setOpening(false)
      setFailed(true)
    })
  }

  return (
    <article className="plan-card plan-card--pro">
      <div className="plan-card__head">
        <span className="plan-card__name">Pro</span>
        <span className="plan-card__price">
          <span className="plan-card__big">{big}</span>
          <span className="plan-card__unit">{unit}</span>
        </span>
        <span className="plan-card__note">{note}</span>
      </div>
      {pro && <span className="plan-card__current">Ton offre actuelle</span>}
      <button
        type="button"
        className="plan-card__cta"
        disabled={action === 'none' || opening || settling}
        aria-describedby={action === 'none' ? 'plan-card-hint' : undefined}
        onClick={open}
      >
        {opening ? 'Ouverture…' : ctaLabel(action, pro)}
        {!opening && <ArrowRight size={15} strokeWidth={2} />}
      </button>
      {compedUntil && action === 'checkout' && (
        <p className="plan-card__hint">
          Ton Pro offert court jusqu’au {formatFullDate(new Date(compedUntil))}.
        </p>
      )}
      {action === 'none' && (
        <p className="plan-card__hint" id="plan-card-hint">
          Le Pro vit sur une enseigne : passe sur ton compte exposant.
        </p>
      )}
      {failed && (
        <p className="plan-card__hint" role="status">
          Le paiement n’a pas pu s’ouvrir. Réessaie dans un instant.
        </p>
      )}
      <hr className="plan-card__rule" />
      <span className="plan-card__group">Tout le gratuit, et :</span>
      {PRO.map((group) => (
        <div key={group.title} className="plan-card__section">
          <span className="plan-card__group">{group.title}</span>
          <Advantages items={group.items} />
        </div>
      ))}
    </article>
  )
}
