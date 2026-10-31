/**
 * QUOI     — une carte de l'Explorer : l'affiche (« Nouveau » si la date vient d'être ajoutée,
 *            l'étoile « Repérer » en haut à droite), le nom, la plage, la ville, et les amis qui y
 *            vont — leurs visages sur la même ligne que leurs noms (Uriel, 19/10/2026).
 * POURQUOI — on parcourt l'Explorer à l'affiche, comme le calendrier ; l'étoile pose la date en
 *            « Intéressé » sans quitter l'écran.
 *            Une date passée dit son année et ni sa ville ni ses amis (maquette 2584:504) ; son
 *            étoile reste, comme le statut sur la fiche d'une date passée.
 * ATTENTION — une date déjà engagée (dossier envoyé, inscrit) garde son étoile pleine et ne se
 *            retire pas d'ici : ça se fait sur la fiche. En gratuit, une date au-delà des 6 mois
 *            ne se repère pas : l'étoile ouvre l'invitation Pro (lib/plan.ts).
 */
import { Check, Star } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { PosterArt } from '@/components/ui/PosterArt'
import { ProBubble } from '@/components/ui/ProBubble'
import { formatDateRange, formatPastRange } from '@/lib/dates'
import { nameLine } from '@/lib/name-line'
import { canChangeStatus, monthsBeyond } from '@/lib/plan'
import { usePlan } from '@/lib/usePlan'
import type { ExploreEvent } from './useExplorer'
import { eventPath } from '@/lib/event-path'

const MAX_FACES = 3

interface ExploreCardProps {
  event: ExploreEvent
  onMark: (event: ExploreEvent) => void
  past?: boolean
}

export function ExploreCard({ event, onMark, past = false }: ExploreCardProps) {
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
      <Link to={eventPath(event.slug)} className="explore-card__link">
        <PosterArt
          eventId={event.id}
          imageUrl={event.imageUrl}
          tags={event.tags}
          startDate={event.startDate}
          daysAway={0}
          badge={event.isNew ? 'Nouveau' : null}
        />
      </Link>
      <button
        type="button"
        className="explore-card__star"
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
      <Link to={eventPath(event.slug)} className="explore-card__info">
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
          {past
            ? formatPastRange(event.startDate, event.endDate)
            : `${formatDateRange(event.startDate, event.endDate)} · ${event.city} (${event.department})`}
        </span>
        {goers && !past && (
          <span className="explore-card__goers">
            <AvatarStack>
              {event.friends.slice(0, MAX_FACES).map((friend) => (
                <Avatar
                  key={friend.id}
                  className="explore-card__face"
                  src={friend.avatarUrl}
                  name={friend.name}
                />
              ))}
            </AvatarStack>
            <span>
              <b>{goers.first}</b>
              {goers.rest}
            </span>
          </span>
        )}
      </Link>
    </article>
  )
}
