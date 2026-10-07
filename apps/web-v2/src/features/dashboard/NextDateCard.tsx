/**
 * QUOI     — la carte de la prochaine date : affiche, compte à rebours, statut.
 * POURQUOI — la date la plus proche mérite sa propre carte ; un clic ouvre sa fiche.
 */
import { Check, Contrast, Target } from 'lucide-react'
import { Chip } from '@/components/ui/Chip'
import { formatCountdown, formatDateRange, parseSqlDate } from '@/lib/dates'
import { formatEuros } from '@/lib/money'
import { useTransitionNavigate } from '@/lib/navigation'
import type { DashboardDate } from './useDashboard'

export function NextDateCard({ date }: { date: DashboardDate }) {
  const { event } = date
  const go = useTransitionNavigate()

  return (
    <button type="button" className="next-date" onClick={() => go(`/evenement/${event.id}`)}>
      {event.image_url ? (
        <img className="next-date__poster" src={event.image_url} alt="" />
      ) : (
        <span className="next-date__poster" />
      )}

      {/* Des `span` et non des `div` : un bouton ne peut contenir que du
          contenu de phrase. Le CSS leur rend leur mise en bloc. */}
      <span className="next-date__body">
        <span className="next-date__title">{event.name}</span>
        <span className="next-date__meta">
          {formatDateRange(date.startDate, parseSqlDate(event.end_date), 'long')} · {event.city} (
          {event.department})
        </span>
        <span className="next-date__chips">
          <Chip>{formatCountdown(date.daysAway)}</Chip>
          {date.confirmed ? (
            <Chip tone="ok" icon={<Check size={12} strokeWidth={2.4} />}>
              Inscrit
            </Chip>
          ) : (
            <Chip tone="pending" icon={<Contrast size={12} strokeWidth={2.4} />}>
              Dossier envoyé
            </Chip>
          )}
          {date.revenueGoal !== null && (
            <Chip icon={<Target size={12} strokeWidth={2} />}>
              Objectif {formatEuros(date.revenueGoal)}
            </Chip>
          )}
        </span>
      </span>
    </button>
  )
}
