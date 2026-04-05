import { Link } from 'react-router-dom'
import { Calendar } from 'lucide-react'

interface CarouselEvent {
  id: string
  name: string
  start_date: string
  end_date: string
  city: string
  primary_tag: string
  image_url?: string | null
}

function formatDay(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric' })
}

function formatMonthYear(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }).replace('.', '')
}

function EventCardItem({ event, past = false }: { event: CarouselEvent; past?: boolean }) {
  const image = event.image_url

  return (
    <Link
      to={`/evenement/${event.id}`}
      className={`flex overflow-hidden rounded-2xl bg-card border border-border transition-shadow hover:shadow-md ${past ? 'opacity-50' : ''}`}
    >
      {/* Portrait image */}
      <div className="w-[90px] shrink-0 bg-muted">
        {image ? (
          <img src={image} alt={event.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Calendar className="h-5 w-5 text-muted-foreground/30" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col justify-center p-3.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-primary leading-none">{formatDay(event.start_date)}</span>
          <span className="text-[0.65rem] font-medium uppercase text-primary/50">{formatMonthYear(event.start_date)}</span>
        </div>
        <p className="mt-1.5 text-sm font-semibold leading-snug text-foreground">{event.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{event.city}</p>
        <span className="mt-1.5 inline-block w-fit rounded-full bg-primary/8 text-primary text-[0.6rem] px-2 py-0.5 font-medium">
          {event.primary_tag}
        </span>
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
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <Calendar className="mx-auto h-10 w-10 text-muted-foreground/20" />
        <p className="mt-3 text-sm text-muted-foreground">Aucun événement pour le moment</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-3 text-[0.6rem] font-semibold uppercase tracking-widest text-muted-foreground/40 flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" />
            Prochains événements
          </h2>
          <div className="space-y-2.5">
            {upcoming.map(e => (
              <EventCardItem key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}
      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-[0.6rem] font-semibold uppercase tracking-widest text-muted-foreground/40 flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" />
            Événements passés
          </h2>
          <div className="space-y-2.5">
            {past.map(e => (
              <EventCardItem key={e.id} event={e} past />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
