/**
 * QUOI     — en gratuit, la carte qui clôt une rangée ou des résultats : « 42 festivals
 *            t'attendent après mars ».
 * POURQUOI — en gratuit, l'Explorer se fouille sur 6 mois (Dev.md, révisé le 08/10/2026). Le
 *            nombre réel des festivals cachés dit mieux qu'une phrase ce que le Pro ouvre.
 */
import { ArrowRight } from 'lucide-react'
import { ProBadge } from '@/components/ui/ProBadge'
import { monthName, monthsAhead } from '@/lib/dates'
import { useTransitionNavigate } from '@/lib/navigation'

export function ProEndCard({ count }: { count: number }) {
  const go = useTransitionNavigate()
  if (count === 0) return null
  // Le dernier mois que le gratuit fouille : celui qui précède l'horizon (lib/plan.ts).
  const lastMonth = monthName(monthsAhead(new Date(), 5))

  return (
    <article className="pro-end-card">
      <ProBadge />
      <p className="pro-month__title">
        {count} {count === 1 ? 'festival t’attend' : 'festivals t’attendent'} après {lastMonth}
      </p>
      <p className="pro-month__text">Le Pro te les ouvre, pour candidater avant les autres.</p>
      <button type="button" className="pro-bubble__link" onClick={() => go('/pro')}>
        Découvrir le Pro
        <ArrowRight size={13} strokeWidth={2} />
      </button>
    </article>
  )
}
