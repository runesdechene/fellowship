import { Link } from 'react-router-dom'
import { Calendar, MapPin, Star, Users } from 'lucide-react'
import { getTagIcon } from '@/components/ui/TagBadge'
import type { EventWithScore } from '@/types/database'
import './EventCard.css'

interface EventCardProps {
  event: EventWithScore
  friendCount?: number
  variant?: 'portrait' | 'horizontal'
  prospection?: boolean
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function formatDay(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric' })
}

function formatMonth(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
}

export function EventCard({ event, friendCount, variant = 'portrait', prospection }: EventCardProps) {
  const img = !!event.image_url
  const cls = img ? 'has-image' : 'no-image'

  if (variant === 'horizontal') {
    return (
      <Link to={`/evenement/${event.id}`} className="event-card-link horizontal">
        {img ? (
          <img src={event.image_url!} alt={event.name} className="event-card-bg" />
        ) : (
          <div className="event-card-bg-empty" />
        )}
        <div
          className="event-card-overlay"
          style={{ background: img
            ? 'linear-gradient(90deg, rgba(15,10,5,0.75) 0%, rgba(15,10,5,0.3) 50%, transparent 100%)'
            : 'none'
          }}
        />
        <div className="event-card-h-content">
          <div className="event-card-h-date">
            <div className={`event-card-h-day ${cls}`}>{formatDay(event.start_date)}</div>
            <div className={`event-card-h-month ${cls}`}>{formatMonth(event.start_date)}</div>
          </div>
          <div className="event-card-h-info">
            <div className={`event-card-h-name ${cls}`}>{event.name}</div>
            <div className={`event-card-h-meta ${cls}`}>
              <MapPin />
              {event.city} · {(() => { const I = getTagIcon((event.tags?.[0] ?? 'autre')); return <I className="inline" size={12} strokeWidth={2} /> })()} {(event.tags?.[0] ?? 'autre')}
            </div>
          </div>
        </div>
      </Link>
    )
  }

  // Portrait (Netflix-style) — default
  const showDeadline = prospection && event.registration_deadline && new Date(event.registration_deadline) > new Date()
  const daysLeft = showDeadline
    // eslint-disable-next-line react-hooks/purity -- live deadline countdown reads current time intentionally
    ? Math.ceil((new Date(event.registration_deadline!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0

  const deadlineBg = showDeadline
    ? daysLeft < 30
      ? { background: 'rgba(220,50,50,0.85)' }
      : daysLeft < 90
        ? { background: 'rgba(220,140,30,0.85)' }
        : img
          ? { background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }
          : { background: 'rgba(61,48,40,0.06)' }
    : undefined

  return (
    <Link to={`/evenement/${event.id}`} className="event-card-link portrait">
      {img ? (
        <img src={event.image_url!} alt={event.name} className="event-card-bg" />
      ) : (
        <div className="event-card-portrait-empty">
          <Calendar />
        </div>
      )}

      <div
        className="event-card-overlay"
        style={{ background: img
          ? 'linear-gradient(180deg, transparent 40%, rgba(15,10,5,0.85) 100%)'
          : 'linear-gradient(180deg, transparent 50%, rgba(61,48,40,0.1) 100%)'
        }}
      />

      {/* Tag badge top-left */}
      {(() => {
        const Icon = getTagIcon((event.tags?.[0] ?? 'autre'))
        return (
          <span className={`event-card-tag ${cls}`}>
            <Icon size={10} strokeWidth={2} />
            {(event.tags?.[0] ?? 'autre')}
          </span>
        )
      })()}

      {/* Date or deadline badge top-right */}
      {showDeadline ? (
        <div className="event-card-deadline" style={deadlineBg}>
          <div className="event-card-deadline-label">Inscription</div>
          <div className="event-card-deadline-days">J-{daysLeft}</div>
        </div>
      ) : (
        <div className={`event-card-date-badge ${cls}`}>
          <div className={`event-card-date-day ${cls}`}>{formatDay(event.start_date)}</div>
          <div className={`event-card-date-month ${cls}`}>{formatMonth(event.start_date)}</div>
        </div>
      )}

      {/* Bottom info */}
      <div className="event-card-bottom">
        <h3 className={`event-card-name ${cls}`}>{event.name}</h3>
        <div className={`event-card-location ${cls}`}>
          <MapPin />
          {event.city}
          {event.end_date !== event.start_date && ` · ${formatDate(event.start_date)} — ${formatDate(event.end_date)}`}
        </div>

        {(event.avg_overall !== null || (friendCount !== undefined && friendCount > 0)) && (
          <div className={`event-card-stats ${cls}`}>
            {event.avg_overall !== null && (
              <span className="event-card-stat">
                <Star className="fill-current" />
                {event.avg_overall}
              </span>
            )}
            {friendCount !== undefined && friendCount > 0 && (
              <span className="event-card-stat">
                <Users />
                {friendCount} ami{friendCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {prospection && event.avg_overall !== null && (
          <div className={`event-card-rating ${cls}`}>
            <Star />
            <span className="event-card-rating-score">{event.avg_overall}</span>
            {event.review_count !== null && <span>({event.review_count})</span>}
          </div>
        )}
      </div>
    </Link>
  )
}
