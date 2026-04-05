import { Link } from 'react-router-dom'
import { Calendar, MapPin, Star, Users } from 'lucide-react'
import type { EventWithScore } from '@/types/database'

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
  if (variant === 'horizontal') {
    return (
      <Link
        to={`/evenement/${event.id}`}
        className="group relative flex h-[120px] overflow-hidden rounded-2xl"
      >
        {event.image_url ? (
          <img src={event.image_url} alt={event.name} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-card" />
        )}
        <div
          className="absolute inset-0"
          style={{ background: event.image_url
            ? 'linear-gradient(90deg, rgba(15,10,5,0.75) 0%, rgba(15,10,5,0.3) 50%, transparent 100%)'
            : 'none'
          }}
        />
        <div className="relative flex w-full items-center gap-4 px-5">
          <div className="text-center shrink-0">
            <div className={`text-[28px] font-extrabold leading-none ${event.image_url ? 'text-white' : 'text-primary'}`}>
              {formatDay(event.start_date)}
            </div>
            <div className={`text-[10px] font-medium uppercase ${event.image_url ? 'text-white/50' : 'text-primary/50'}`}>
              {formatMonth(event.start_date)}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-base font-bold truncate ${event.image_url ? 'text-white' : 'text-foreground'}`}>
              {event.name}
            </div>
            <div className={`text-[11px] mt-1 flex items-center gap-1 ${event.image_url ? 'text-white/45' : 'text-muted-foreground'}`}>
              <MapPin className="h-3 w-3" />
              {event.city} · {event.primary_tag}
            </div>
          </div>
        </div>
      </Link>
    )
  }

  // Portrait (Netflix-style) — default
  return (
    <Link
      to={`/evenement/${event.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl"
      style={{ aspectRatio: '2/3' }}
    >
      {event.image_url ? (
        <img src={event.image_url} alt={event.name} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-card to-secondary flex items-center justify-center">
          <Calendar className="h-12 w-12 text-muted-foreground/10" />
        </div>
      )}

      <div
        className="absolute inset-0"
        style={{ background: event.image_url
          ? 'linear-gradient(180deg, transparent 40%, rgba(15,10,5,0.85) 100%)'
          : 'linear-gradient(180deg, transparent 50%, rgba(61,48,40,0.1) 100%)'
        }}
      />

      <div className="absolute left-3 top-3">
        <span
          className="rounded-full px-2.5 py-0.5 text-[10px] font-medium"
          style={event.image_url
            ? { background: 'rgba(255,255,255,0.15)', color: 'white', backdropFilter: 'blur(6px)' }
            : { background: 'rgba(61,48,40,0.08)', color: 'rgba(61,48,40,0.5)' }
          }
        >
          {event.primary_tag}
        </span>
      </div>

      <div className="absolute right-3 top-3">
        {(() => {
          const showDeadline =
            prospection &&
            event.registration_deadline &&
            new Date(event.registration_deadline) > new Date()

          if (showDeadline) {
            const daysLeft = Math.ceil(
              (new Date(event.registration_deadline!).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24)
            )
            const badgeBg =
              daysLeft < 30
                ? { background: 'rgba(220,50,50,0.85)' }
                : daysLeft < 90
                  ? { background: 'rgba(220,140,30,0.85)' }
                  : event.image_url
                    ? { background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }
                    : { background: 'rgba(61,48,40,0.06)' }
            return (
              <div className="rounded-xl px-2.5 py-1.5 text-center" style={badgeBg}>
                <div className="text-[8px] font-semibold uppercase text-white/80">
                  Inscription
                </div>
                <div className="text-[14px] font-bold leading-none text-white">
                  J-{daysLeft}
                </div>
              </div>
            )
          }

          return (
            <div
              className="rounded-xl px-2.5 py-1.5 text-center"
              style={event.image_url
                ? { background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }
                : { background: 'rgba(61,48,40,0.06)' }
              }
            >
              <div className={`text-lg font-extrabold leading-none ${event.image_url ? 'text-white' : 'text-foreground/50'}`}>
                {formatDay(event.start_date)}
              </div>
              <div className={`text-[9px] font-semibold uppercase ${event.image_url ? 'text-white/60' : 'text-foreground/30'}`}>
                {formatMonth(event.start_date)}
              </div>
            </div>
          )
        })()}
      </div>

      <div className="mt-auto relative p-4">
        <h3 className={`text-base font-bold leading-snug ${event.image_url ? 'text-white' : 'text-foreground'}`}>
          {event.name}
        </h3>
        <div className={`mt-1.5 flex items-center gap-1 text-[11px] ${event.image_url ? 'text-white/50' : 'text-muted-foreground'}`}>
          <MapPin className="h-3 w-3" />
          {event.city}
          {event.end_date !== event.start_date && ` · ${formatDate(event.start_date)} — ${formatDate(event.end_date)}`}
        </div>

        {(event.avg_overall !== null || (friendCount !== undefined && friendCount > 0)) && (
          <div className={`mt-2 flex items-center gap-3 text-[11px] ${event.image_url ? 'text-white/40' : 'text-muted-foreground'}`}>
            {event.avg_overall !== null && (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-current" />
                {event.avg_overall}
              </span>
            )}
            {friendCount !== undefined && friendCount > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {friendCount} ami{friendCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {prospection && event.avg_overall !== null && (
          <div className={`mt-1.5 flex items-center gap-1 text-[11px] ${event.image_url ? 'text-white/50' : 'text-muted-foreground'}`}>
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="font-bold">{event.avg_overall}</span>
            {event.review_count !== null && <span>({event.review_count})</span>}
          </div>
        )}
      </div>
    </Link>
  )
}
