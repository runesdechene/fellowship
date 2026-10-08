/**
 * QUOI     — en gratuit, la colonne qui clôt la frise : le septième mois, et la carte « {Mois} et
 *            au-delà » qui invite au Pro.
 * POURQUOI — le gratuit planifie six mois (lib/plan.ts) ; la frise le montre au lieu de
 *            s'arrêter net (maquette « Points de contact du Pro », calendrier).
 */
import { ArrowRight } from 'lucide-react'
import { ProBadge } from '@/components/ui/ProBadge'
import type { MonthSlot } from '@/lib/dates'
import { useTransitionNavigate } from '@/lib/navigation'
import { monthsBeyond } from '@/lib/plan'

export function ProMonth({ slot, today }: { slot: MonthSlot; today: Date }) {
  const go = useTransitionNavigate()
  const { label } = slot
  const away = monthsBeyond(slot.date, today)

  return (
    <section className="month-column" aria-label={`${label} et au-delà`}>
      <header className="month-column__head">
        <h2 className="month-column__name">{label}</h2>
        <div className="month-column__count">Dans {away} mois</div>
      </header>
      <div className="pro-month">
        <ProBadge />
        <p className="pro-month__title">{label} et au-delà</p>
        <p className="pro-month__text">
          Pose tes dates sur toute l’année et ne rate plus une candidature.
        </p>
        <button type="button" className="pro-bubble__link" onClick={() => go('/pro')}>
          Découvrir le Pro
          <ArrowRight size={13} strokeWidth={2} />
        </button>
      </div>
    </section>
  )
}
