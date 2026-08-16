import { CheckCheck } from 'lucide-react'
import { Chip } from '@/components/ui/Chip'
import { formatCountdown, formatDayMonth } from '@/lib/dates'
import type { DashboardDate } from './useDashboard'

export function NextDateCard({ date }: { date: DashboardDate }) {
  const { event } = date

  return (
    <article className="next-date">
      {event.image_url ? (
        <img className="next-date__poster" src={event.image_url} alt="" />
      ) : (
        <div className="next-date__poster" />
      )}

      <div className="next-date__body">
        <h3 className="next-date__title">{event.name}</h3>
        <p className="next-date__meta">
          Le <b>{formatDayMonth(date.startDate)}</b> - {event.city} ({event.department})
        </p>
        <div className="next-date__chips">
          <Chip>{formatCountdown(date.daysAway)}</Chip>
          {date.confirmed ? (
            <Chip tone="ok" icon={<CheckCheck size={11} strokeWidth={2.25} />}>
              Inscrit
            </Chip>
          ) : (
            <Chip tone="pending">Dossier en cours</Chip>
          )}
        </div>
      </div>
    </article>
  )
}
