import { CheckCheck } from 'lucide-react'
import { Chip } from '@/components/ui/Chip'
import { formatCountdown, formatDayMonth } from '@/lib/dates'
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
          Le <b>{formatDayMonth(date.startDate)}</b> - {event.city} ({event.department})
        </span>
        <span className="next-date__chips">
          <Chip>{formatCountdown(date.daysAway)}</Chip>
          {date.confirmed ? (
            <Chip tone="ok" icon={<CheckCheck size={11} strokeWidth={2.25} />}>
              Inscrit
            </Chip>
          ) : (
            <Chip tone="pending">Dossier en cours</Chip>
          )}
        </span>
      </span>
    </button>
  )
}
