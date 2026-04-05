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
      className={`flex-shrink-0 w-40 snap-start rounded-2xl p-4 transition-all hover:bg-white/10 ${past ? 'opacity-50' : ''}`}
      style={{
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="text-3xl font-bold leading-none" style={{ color: 'hsl(24 72% 60%)' }}>
        {formatDay(event.start_date)}
      </div>
      <div className="text-sm font-medium uppercase" style={{ color: 'hsl(24 72% 60% / 0.7)' }}>
        {formatMonth(event.start_date)}
      </div>
      <p className="mt-3 text-sm font-semibold leading-snug truncate text-white/80">{event.name}</p>
      <p className="mt-1 text-xs text-white/40 truncate">{event.city}</p>
      <span
        className="mt-2 inline-block rounded-full text-[0.65rem] px-2 py-0.5 font-medium"
        style={{ background: 'hsl(24 72% 60% / 0.15)', color: 'hsl(24 72% 60%)' }}
      >
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
      <div
        className="rounded-2xl p-10 text-center"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.1)' }}
      >
        <Calendar className="mx-auto h-10 w-10 text-white/20" />
        <p className="mt-3 text-sm text-white/40">Aucun événement pour le moment</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30 flex items-center gap-2">
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
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30 flex items-center gap-2">
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
