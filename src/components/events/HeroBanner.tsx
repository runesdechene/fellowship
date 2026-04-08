import { Link } from 'react-router-dom'
import { MapPin, Calendar, ArrowRight } from 'lucide-react'
import { getTagIcon } from '@/components/ui/TagBadge'
import type { EventWithScore } from '@/types/database'
import './HeroBanner.css'

interface HeroBannerProps {
  event: EventWithScore
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function HeroBanner({ event }: HeroBannerProps) {
  return (
    <Link to={`/evenement/${event.id}`} className="hero-banner">
      {event.image_url ? (
        <img src={event.image_url} alt={event.name} />
      ) : (
        <div className="hero-banner-fallback">
          <Calendar strokeWidth={1} />
        </div>
      )}
      <div className="hero-banner-gradient" />
      <div className="hero-banner-content">
        {(() => { const I = getTagIcon((event.tags?.[0] ?? 'autre')); return <span className="hero-banner-tag"><I size={12} strokeWidth={2} className="inline -mt-px" /> {(event.tags?.[0] ?? 'autre')}</span> })()}
        <div className="hero-banner-title">{event.name}</div>
        <div className="hero-banner-meta">
          <MapPin strokeWidth={1.5} />
          {event.city} · {formatDate(event.start_date)}
          {event.end_date !== event.start_date && ` — ${formatDate(event.end_date)}`}
        </div>
        <span className="hero-banner-cta">
          Voir l'événement
          <ArrowRight style={{ width: 16, height: 16 }} strokeWidth={2} />
        </span>
      </div>
    </Link>
  )
}
