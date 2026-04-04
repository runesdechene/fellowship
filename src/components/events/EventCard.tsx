import { Link } from 'react-router-dom'
import { Calendar, MapPin, Star, Users } from 'lucide-react'
import type { EventWithScore } from '@/types/database'

interface EventCardProps {
  event: EventWithScore
  friendCount?: number
}

export function EventCard({ event, friendCount }: EventCardProps) {
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

  return (
    <Link
      to={`/evenement/${event.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
    >
      {event.image_url ? (
        <img src={event.image_url} alt={event.name} className="h-40 w-full object-cover" />
      ) : (
        <div className="flex h-40 items-center justify-center bg-muted">
          <Calendar className="h-10 w-10 text-muted-foreground/30" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <span className="mb-2 inline-flex w-fit rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-primary">
          {event.primary_tag}
        </span>
        <h3 className="font-semibold group-hover:text-primary transition-colors">{event.name}</h3>
        <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{formatDate(event.start_date)}{event.end_date !== event.start_date && ` — ${formatDate(event.end_date)}`}</span>
        </div>
        <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span>{event.city}, {event.department}</span>
        </div>
        <div className="mt-auto flex items-center gap-3 pt-3">
          {event.avg_overall !== null && (
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-3.5 w-3.5 fill-accent text-accent" />
              <span className="font-medium">{event.avg_overall}</span>
              <span className="text-muted-foreground">({event.review_count})</span>
            </div>
          )}
          {friendCount !== undefined && friendCount > 0 && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>{friendCount} ami{friendCount > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
