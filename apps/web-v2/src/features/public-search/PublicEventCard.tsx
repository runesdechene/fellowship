/**
 * QUOI     — une carte de la recherche publique : l'affiche, le nom, la plage et la ville.
 * POURQUOI — maquette 2314:2 : sans compte, ni étoile « Repérer », ni amis ; la carte ouvre la
 *            fiche, ouverte à tous par lien direct.
 */
import { Link } from 'react-router-dom'
import { Poster } from '@/components/ui/Poster'
import { formatDateRange } from '@/lib/dates'
import type { SearchEvent } from '@/lib/event-search'

export function PublicEventCard({ event }: { event: SearchEvent }) {
  return (
    <Link to={`/evenement/${event.id}`} className="public-card">
      <Poster imageUrl={event.imageUrl} tags={event.tags} className="public-card__poster" />
      <span className="public-card__name">{event.name}</span>
      <span className="public-card__meta">
        {formatDateRange(event.startDate, event.endDate)} · {event.city} ({event.department})
      </span>
    </Link>
  )
}
