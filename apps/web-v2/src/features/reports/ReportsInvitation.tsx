/**
 * QUOI     — l'invitation Pro posée sur Mes bilans flouté : ce que les bilans apportent, et ce que
 *            le Pro ajoute.
 * POURQUOI — maquette « Mes bilans · compte gratuit » : on dit ce que l'outil donne, avec les
 *            vrais avantages du Pro, sans cacher la page dessous.
 */
import { ArrowRight, Check } from 'lucide-react'
import { ProBadge } from '@/components/ui/ProBadge'
import { useTransitionNavigate } from '@/lib/navigation'

const ADVANTAGES = [
  'Toute ton année : pose des dates au-delà de 6 mois',
  'Un rappel avant chaque clôture de candidature',
  'Prévenu dès qu’un festival que tu as fait annonce sa nouvelle édition',
  'Les notes détaillées des festivals, rentabilité comprise',
  'Tes objectifs et tes bilans, festival par festival',
  'Le badge Certifié sur ta vitrine',
]

export function ReportsInvitation() {
  const go = useTransitionNavigate()

  return (
    <div className="reports-invitation">
      <ProBadge />
      <h2 className="reports-invitation__title">
        Sache ce que chaque festival t’a vraiment apporté
      </h2>
      <p className="reports-invitation__text">
        Avec le Pro, tu fixes un objectif avant chaque date et tu le compares à ce que tu as fait.
        Tes bilans restent visibles par toi seul.
      </p>
      <ul className="reports-invitation__list">
        {ADVANTAGES.map((advantage) => (
          <li key={advantage}>
            <Check size={15} strokeWidth={2} />
            {advantage}
          </li>
        ))}
      </ul>
      <div className="reports-invitation__actions">
        <button type="button" className="reports-invitation__cta" onClick={() => go('/pro')}>
          Découvrir le Pro
          <ArrowRight size={15} strokeWidth={2} />
        </button>
        <button type="button" className="reports-invitation__later" onClick={() => go('/')}>
          Pas maintenant
        </button>
      </div>
    </div>
  )
}
