/**
 * QUOI     — la carte d'un festival en ligne : son affiche, son nom, ses dates et son lieu. Elle mène à
 *            sa fiche, ou, avec `onRemove`, porte une croix pour la retirer.
 * POURQUOI — la même carte dans le fil de Ma communauté, dans la saisie d'un message et dans sa
 *            bulle (maquette 2815:233) : un seul composant.
 */
import { X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDateRange, parseSqlDate } from '@/lib/dates'
import { eventPath } from '@/lib/event-path'
import { Poster } from './Poster'

export interface ChipEvent {
  id: string
  name: string
  startDate: string
  endDate: string
  imageUrl: string | null
  tags: string[]
  city: string | null
  department: string | null
}

export function EventChip({ event, onRemove }: { event: ChipEvent; onRemove?: () => void }) {
  const dates = formatDateRange(parseSqlDate(event.startDate), parseSqlDate(event.endDate))
  const place = event.city
    ? ` · ${event.city}${event.department ? ` (${event.department})` : ''}`
    : ''
  const content = (
    <>
      <Poster imageUrl={event.imageUrl} tags={event.tags} className="event-chip__poster" />
      <span className="event-chip__body">
        <span className="event-chip__name">{event.name}</span>
        <span className="event-chip__meta">
          {dates}
          {place}
        </span>
      </span>
    </>
  )
  if (!onRemove) {
    return (
      <Link className="event-chip" to={eventPath(event.id)}>
        {content}
      </Link>
    )
  }
  return (
    <span className="event-chip">
      {content}
      <button
        type="button"
        className="event-chip__remove"
        aria-label={`Retirer ${event.name}`}
        onClick={onRemove}
      >
        <X size={14} strokeWidth={2} />
      </button>
    </span>
  )
}
