/**
 * QUOI     — « L'année dernière, tu as fait +2 870 € », en haut à droite de la fiche d'une nouvelle
 *            édition, avec de quoi ouvrir le bilan.
 * POURQUOI — maquette 2518:233 (25/10/2026) : le bilan de l'an passé se dit en une ligne, discrète,
 *            au lieu d'une carte qui poussait toute la fiche vers le bas.
 * ATTENTION — recettes verrouillées (`report.masked`) : « •••• € » à la place du net, incomplet.
 *            Bilans = Pro : en gratuit, le montant reste flouté et le bouton mène à l'offre des
 *            bilans, comme le voile de l'écran des bilans.
 */
import { ArrowRight, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatSignedEuros, MASKED_EUROS } from '@/lib/money'
import { usePlan } from '@/lib/usePlan'
import type { LastEditionReport as Report } from './useLastEditionReport'

export function LastEditionReport({ report }: { report: Report }) {
  const { pro } = usePlan()

  return (
    <aside className="last-year" aria-label="Ton bilan de l’an passé">
      <span className="last-year__badge" aria-hidden="true">
        <TrendingUp size={18} strokeWidth={2} />
      </span>
      <span className="last-year__text">
        <span className="last-year__lead">L’année dernière, tu as fait</span>
        <span
          className={pro ? 'last-year__amount' : 'last-year__amount last-year__amount--veiled'}
          aria-hidden={!pro}
        >
          {report.masked ? MASKED_EUROS : formatSignedEuros(report.net)}
        </span>
      </span>
      <Link className="last-year__open" to={pro ? `/bilans/${report.eventId}` : '/bilans'}>
        Bilan
        <ArrowRight size={12} strokeWidth={2} />
      </Link>
    </aside>
  )
}
