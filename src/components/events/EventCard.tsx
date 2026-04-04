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
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
    >
      {event.image_url ? (
        <div className="relative h-44 overflow-hidden">
          <img src={event.image_url} alt={event.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium text-foreground backdrop-blur-sm">
            {event.primary_tag}
          </span>
        </div>
      ) : (
        <div className="relative flex h-44 items-center justify-center bg-gradient-to-br from-muted to-secondary">
          <Calendar className="h-10 w-10 text-muted-foreground/20" />
          <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium text-foreground backdrop-blur-sm">
            {event.primary_tag}
          </span>
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-base leading-snug group-hover:text-primary">{event.name}</h3>
        <div className="mt-2.5 space-y-1">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>{formatDate(event.start_date)}{event.end_date !== event.start_date && ` — ${formatDate(event.end_date)}`}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>{event.city}, {event.department}</span>
          </div>
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
