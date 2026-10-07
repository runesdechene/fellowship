/**
 * QUOI     — l'affiche d'une date : l'image (ou la grande date en serif quand il n'y en a pas), le
 *            compte à rebours en haut, les amis présents en bas.
 * POURQUOI — la même affiche vit dans le calendrier, la vitrine et l'Explorer ; sa hauteur vient du
 *            parent (`--poster-art-height`).
 * ATTENTION — `badge` remplace le compte à rebours (« Nouveau » dans l'Explorer) ; `action` se pose
 *            en haut à droite (l'étoile « Repérer »).
 */
import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { formatCountdown } from '@/lib/dates'
import type { ReactNode } from 'react'
import type { Friend } from '@/lib/friends'

const MONTH_LONG = new Intl.DateTimeFormat('fr-FR', { month: 'long' })
const MAX_FACES = 3

interface PosterArtProps {
  imageUrl: string | null
  startDate: Date
  daysAway: number
  friends: Friend[]
  /** Le texte du coin haut gauche ; par défaut, le compte à rebours. */
  badge?: string | null
  action?: ReactNode
}

export function PosterArt({
  imageUrl,
  startDate,
  daysAway,
  friends,
  badge,
  action,
}: PosterArtProps) {
  const corner = badge === undefined ? formatCountdown(daysAway) : badge
  const faces = friends.slice(0, MAX_FACES)
  const more = friends.length - faces.length

  return (
    <div className="poster-art">
      {imageUrl ? (
        <img className="poster-art__image" src={imageUrl} alt="" />
      ) : (
        <div className="poster-art__fallback">
          <span className="poster-art__day">{startDate.getDate()}</span>
          <span className="poster-art__month">{MONTH_LONG.format(startDate)}</span>
        </div>
      )}
      {corner && <span className="poster-art__countdown">{corner}</span>}
      {action && <span className="poster-art__action">{action}</span>}
      {faces.length > 0 && (
        <span className="poster-art__friends">
          <AvatarStack>
            {faces.map((friend) => (
              <Avatar
                key={friend.id}
                className="poster-art__face"
                src={friend.avatarUrl}
                name={friend.name}
              />
            ))}
          </AvatarStack>
          {more > 0 && <span className="poster-art__more">+{more}</span>}
        </span>
      )}
    </div>
  )
}
