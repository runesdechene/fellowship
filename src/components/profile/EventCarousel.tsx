import { Link } from 'react-router-dom'
import { Calendar, MapPin } from 'lucide-react'
import { getTagColor } from '@/lib/constants'
import { getTagIcon } from '@/components/ui/TagBadge'

interface CarouselEvent {
  id: string
  name: string
  start_date: string
  end_date: string
  city: string
  department?: string
  tags: string[] | null
  image_url?: string | null
}

function formatDay(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric' })
}

function formatMonthYear(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }).replace('.', '')
}

function EventCardItem({ event, past = false }: { event: CarouselEvent; past?: boolean }) {
  const image = event.image_url
  const tagSlug = event.tags?.[0] ?? 'autre'
  const TagIcon = getTagIcon(tagSlug)
  const tagColor = getTagColor(tagSlug)

  return (
    <Link
      to={`/evenement/${event.id}`}
      className={`profile-event-card ${past ? 'past' : ''}`}
    >
      {image && (
        <div className="profile-event-image">
          <img src={image} alt={event.name} />
        </div>
      )}
      <div className="profile-event-info">
        <div className="profile-event-row">
          <div className="profile-event-details">
            <div className="profile-event-name">{event.name}</div>
            {/* eslint-disable-next-line react-hooks/static-components -- TagIcon is from TAG_ICONS static lookup, ref is stable */}
            <span className="profile-event-tag inline-flex items-center gap-1" style={{ background: tagColor.bg, color: tagColor.color }}><TagIcon size={10} strokeWidth={2} />{tagSlug}</span>
            <div className="profile-event-meta">
              <MapPin strokeWidth={1.5} />
              <span>{event.city}{event.department ? ` (${event.department})` : ''}</span>
            </div>
          </div>
          <div className="profile-event-date">
            <span className="profile-event-day">{formatDay(event.start_date)}</span>
            <span className="profile-event-month">{formatMonthYear(event.start_date)}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

interface EventCarouselProps {
  upcoming: CarouselEvent[]
  past: CarouselEvent[]
}

export function EventCarousel({ upcoming, past }: EventCarouselProps) {
  if (upcoming.length === 0 && past.length === 0) {
    return (
      <div className="profile-events-empty">
        <Calendar strokeWidth={1} />
        <p className="profile-events-empty-text">Aucun événement pour le moment</p>
      </div>
    )
  }

  return (
    <div className="profile-events-section">
      {upcoming.length > 0 && (
        <section>
          <h2 className="profile-events-label">
            <Calendar strokeWidth={1.5} />
            Prochains événements
          </h2>
          <div className="profile-events-list">
            {upcoming.map(e => (
              <EventCardItem key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}
      {past.length > 0 && (
        <section>
          <h2 className="profile-events-label">
            <Calendar strokeWidth={1.5} />
            Événements passés
          </h2>
          <div className="profile-events-list">
            {past.map(e => (
              <EventCardItem key={e.id} event={e} past />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
