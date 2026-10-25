/**
 * QUOI     — une carte de la recherche publique : l'affiche, la ville en tête, le nom, la plage et
 *            l'extrait de la description.
 * POURQUOI — maquette 2314:2, revue par Uriel le 15/10/2026 : la ville passe devant (un exposant
 *            choisit d'abord où il peut aller), et deux lignes de description disent le festival.
 *            Sans compte, ni étoile « Repérer », ni amis ; la carte ouvre la fiche.
 */
import { MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Poster } from '@/components/ui/Poster'
import { formatDateRange } from '@/lib/dates'
import type { PublicEvent } from './usePublicSearch'
import { eventPath } from '@/lib/event-path'

export function PublicEventCard({ event }: { event: PublicEvent }) {
  return (
    <Link to={eventPath(event.slug)} className="public-card">
      <Poster imageUrl={event.imageUrl} tags={event.tags} className="public-card__poster" />
      <span className="public-card__place">
        <MapPin size={14} strokeWidth={2.2} aria-hidden />
        {event.city} ({event.department})
      </span>
      <span className="public-card__name">{event.name}</span>
      <span className="public-card__meta">{formatDateRange(event.startDate, event.endDate)}</span>
      {event.description && <span className="public-card__text">{event.description}</span>}
    </Link>
  )
}
