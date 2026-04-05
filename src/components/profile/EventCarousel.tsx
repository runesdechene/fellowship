import { Link } from 'react-router-dom'
import { Calendar } from 'lucide-react'

interface CarouselEvent {
  id: string
  name: string
  start_date: string
  end_date: string
  city: string
  primary_tag: string
}

function formatDay(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: 'numeric' })
}

function formatMonth(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
}

function EventCardItem({ event, past = false }: { event: CarouselEvent; past?: boolean }) {
  return (
    <Link
      to={`/evenement/${event.id}`}
      className={`flex-shrink-0 w-48 snap-start rounded-2xl bg-card shadow-[2px_0_40px_-10px_rgba(0,0,0,0.06)] p-4 hover:shadow-[2px_0_40px_-10px_rgba(0,0,0,0.12)] transition-shadow ${past ? 'opacity-60' : ''}`}
    >
      <div className="text-3xl font-bold text-primary leading-none">{formatDay(event.start_date)}</div>
      <div className="text-sm font-medium text-primary/70 uppercase">{formatMonth(event.start_date)}</div>
      <p className="mt-3 text-sm font-semibold leading-snug truncate">{event.name}</p>
      <p className="mt-1 text-xs text-muted-foreground truncate">{event.city}</p>
      <span className="mt-2 inline-block rounded-full bg-primary/10 text-primary text-[0.65rem] px-2 py-0.5 font-medium">
        {event.primary_tag}
      </span>
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
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <Calendar className="mx-auto h-10 w-10 text-muted-foreground/30" />
        <p className="mt-3 text-sm text-muted-foreground">Aucun événement pour le moment</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Prochains événements
          </h2>
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide">
            {upcoming.map(e => (
              <EventCardItem key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}
      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Événements passés
          </h2>
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide">
            {past.map(e => (
              <EventCardItem key={e.id} event={e} past />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
