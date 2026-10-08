/**
 * QUOI     — une carte de l'Explorer : l'affiche (« Nouveau » si la date vient d'être ajoutée,
 *            l'étoile « Repérer » en haut à droite), le nom, la plage, la ville, et les amis qui y
 *            vont.
 * POURQUOI — on parcourt l'Explorer à l'affiche, comme le calendrier ; l'étoile pose la date en
 *            « Intéressé » sans quitter l'écran.
 * ATTENTION — une date déjà engagée (dossier envoyé, inscrit) garde son étoile pleine et ne se
 *            retire pas d'ici : ça se fait sur la fiche. En gratuit, une date au-delà des 6 mois
 *            ne se repère pas : l'étoile ouvre l'invitation Pro (lib/plan.ts).
 */
import { Check, Star } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PosterArt } from '@/components/ui/PosterArt'
import { ProBubble } from '@/components/ui/ProBubble'
import { formatDateRange } from '@/lib/dates'
import { nameLine } from '@/lib/name-line'
import { canChangeStatus, monthsBeyond } from '@/lib/plan'
import { usePlan } from '@/lib/usePlan'
import type { ExploreEvent } from './useExplorer'

interface ExploreCardProps {
  event: ExploreEvent
  onMark: (event: ExploreEvent) => void
}

export function ExploreCard({ event, onMark }: ExploreCardProps) {
  const engaged = event.myStatus !== null && event.myStatus !== 'interesse'
  const marked = event.myStatus !== null
  const registered = event.myStatus === 'inscrit' || event.myStatus === 'confirme'
  const { pro } = usePlan()
  const today = new Date()
  const locked = !canChangeStatus(event.startDate, marked, pro, today)
  const [inviting, setInviting] = useState(false)
  const card = useRef<HTMLElement>(null)

  // Un clic ailleurs referme l'invitation.
  useEffect(() => {
    if (!inviting) return
    function outside(clic: MouseEvent) {
      if (clic.target instanceof Node && !card.current?.contains(clic.target)) setInviting(false)
    }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [inviting])
  const goers = nameLine(
    event.friends.map((friend) => friend.name),
    { one: 'y va', many: 'y vont' },
  )

  return (
    <article className="explore-card" ref={card}>
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
          if (locked) setInviting((open) => !open)
          else onMark(event)
        }}
      >
        <Star size={14} strokeWidth={2} />
      </button>
      {inviting && (
        <ProBubble
          className="explore-card__bubble"
          title={`Ce festival est dans ${monthsBeyond(event.startDate, today)} mois`}
          text="En gratuit, tu planifies tes 6 prochains mois. Le Pro t’ouvre toute ton année."
          onClose={() => {
            setInviting(false)
          }}
        />
      )}
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
