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
  const tagSlug = event.tags?.[0] ?? 'autre'
  const TagIcon = getTagIcon(tagSlug)
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
        {/* eslint-disable-next-line react-hooks/static-components -- TagIcon is from TAG_ICONS static lookup, ref is stable */}
        <span className="hero-banner-tag"><TagIcon size={12} strokeWidth={2} className="inline -mt-px" /> {tagSlug}</span>
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
