import { Link } from 'react-router-dom'
import { splitSeason } from '@/lib/vitrine'
import { formatDateRange } from '@/lib/calendar-format'
import type { SeasonEvent } from '@/lib/vitrine'

interface VitrineSeasonProps {
  season: SeasonEvent[]
}

function FestRow({ event, isPast }: { event: SeasonEvent; isPast?: boolean }) {
  const dateLabel = formatDateRange(
    new Date(event.start_date),
    new Date(event.end_date),
  )
  const geo = [event.city, event.department ? `(${event.department})` : null]
    .filter(Boolean)
    .join(' ')
  const meta = [dateLabel, geo].filter(Boolean).join(' · ')

  return (
    <Link
      to={`/evenement/${event.id}`}
      state={{ from: '/' }}
      className={`v-fest${isPast ? ' v-past' : ''}`}
    >
      <div className="v-fimg">
        {event.image_url && <img src={event.image_url} alt="" loading="lazy" />}
      </div>
      <div className="v-fb">
        <b>{event.name}</b>
        {meta && <span className="v-fmeta">{meta}</span>}
      </div>
    </Link>
  )
}

export function VitrineSeason({ season }: VitrineSeasonProps) {
  const { upcoming, past } = splitSeason(season, new Date())
  const hasEvents = upcoming.length > 0 || past.length > 0

  return (
    <div className="v-card">
      <h2>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        Où me rencontrer
      </h2>

      {!hasEvents && (
        <p className="v-season-empty">Aucune date publiée.</p>
      )}

      {upcoming.map((e) => (
        <FestRow key={e.id} event={e} />
      ))}

      {past.length > 0 && (
        <>
          <div className="v-past-head">Déjà passés</div>
          {past.map((e) => (
            <FestRow key={e.id} event={e} isPast />
          ))}
        </>
      )}
    </div>
  )
}
