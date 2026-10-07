/**
 * QUOI     — une carte de l'Explorer : l'affiche (« Nouveau » si la date vient d'être ajoutée,
 *            l'étoile « Repérer » en haut à droite), le nom, la plage, la ville, et les amis qui y
 *            vont.
 * POURQUOI — on parcourt l'Explorer à l'affiche, comme le calendrier ; l'étoile pose la date en
 *            « Intéressé » sans quitter l'écran.
 * ATTENTION — une date déjà engagée (dossier envoyé, inscrit) garde son étoile pleine et ne se
 *            retire pas d'ici : ça se fait sur la fiche.
 */
import { Check, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PosterArt } from '@/components/ui/PosterArt'
import { formatDateRange } from '@/lib/dates'
import { nameLine } from '@/lib/name-line'
import type { ExploreEvent } from './useExplorer'

interface ExploreCardProps {
  event: ExploreEvent
  onMark: (event: ExploreEvent) => void
}

export function ExploreCard({ event, onMark }: ExploreCardProps) {
  const engaged = event.myStatus !== null && event.myStatus !== 'interesse'
  const marked = event.myStatus !== null
  const registered = event.myStatus === 'inscrit' || event.myStatus === 'confirme'
  const goers = nameLine(
    event.friends.map((friend) => friend.name),
    { one: 'y va', many: 'y vont' },
  )

  return (
    <article className="explore-card">
      <Link to={`/evenement/${event.id}`} className="explore-card__link">
        <PosterArt
          imageUrl={event.imageUrl}
          startDate={event.startDate}
          daysAway={0}
          friends={event.friends}
          badge={event.isNew ? 'Nouveau' : null}
        />
      </Link>
      <button
        type="button"
        className={marked ? 'explore-card__star explore-card__star--on' : 'explore-card__star'}
        aria-pressed={marked}
        aria-label={marked ? 'Retirer de mes repérages' : 'Repérer cette date'}
        title={engaged ? 'Déjà dans ton calendrier' : undefined}
        disabled={engaged}
        onClick={() => {
          onMark(event)
        }}
      >
        <Star size={14} strokeWidth={2} />
      </button>
      <Link to={`/evenement/${event.id}`} className="explore-card__info">
        <span className="explore-card__row">
          <span className="explore-card__name">{event.name}</span>
          {registered && (
            <span className="explore-card__chip">
              <Check size={11} strokeWidth={2.4} />
              Inscrit
            </span>
          )}
        </span>
        <span className="explore-card__meta">
          {formatDateRange(event.startDate, event.endDate)} · {event.city} ({event.department})
        </span>
        {goers && (
          <span className="explore-card__goers">
            <b>{goers.first}</b>
            {goers.rest}
          </span>
        )}
      </Link>
    </article>
  )
}
