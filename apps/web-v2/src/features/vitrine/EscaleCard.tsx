/**
 * QUOI     — une prochaine escale de la vitrine : l'affiche, le nom, la plage, la ville, la durée,
 *            et les amis du visiteur qui y vont.
 * POURQUOI — c'est ce qui fait venir : on voit où retrouver l'artisan, et avec qui.
 */
import { Link } from 'react-router-dom'
import { PosterArt } from '@/components/ui/PosterArt'
import { durationLabel, formatDateRange } from '@/lib/dates'
import { meetLine } from '@/lib/vitrine'
import type { VitrineDate } from './useVitrine'

export function EscaleCard({ date }: { date: VitrineDate }) {
  const meet = meetLine(date.friends.map((friend) => friend.name))

  return (
    <Link to={`/evenement/${date.eventId}`} className="escale-card">
      <PosterArt
        imageUrl={date.imageUrl}
        startDate={date.startDate}
        daysAway={date.daysAway}
        friends={date.friends}
      />
      <div className="escale-card__info">
        <span className="escale-card__name">{date.name}</span>
        <span className="escale-card__meta">
          {formatDateRange(date.startDate, date.endDate)} · {date.city} ({date.department}) ·{' '}
          {durationLabel(date.startDate, date.endDate)}
        </span>
        {meet && (
          <span className="escale-card__meet">
            <b>{meet.first}</b>
            {meet.rest}
          </span>
        )}
      </div>
    </Link>
  )
}
