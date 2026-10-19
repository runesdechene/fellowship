/**
 * QUOI     — la grande affiche d'une date : l'affiche (Poster.tsx ; absente, la grande date en
 *            serif s'y écrit), le compte à rebours en haut, les amis présents en bas.
 * POURQUOI — la même affiche vit dans le calendrier, la vitrine et l'Explorer ; sa hauteur vient du
 *            parent (`--poster-art-height`).
 * ATTENTION — `badge` remplace le compte à rebours (« Nouveau » dans l'Explorer) ; `action` se pose
 *            en haut à droite (l'étoile « Repérer »).
 */
import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { formatCountdown } from '@/lib/dates'
import type { ReactNode } from 'react'
import { Poster } from '@/components/ui/Poster'
import type { Friend } from '@/lib/friends'

const MONTH_LONG = new Intl.DateTimeFormat('fr-FR', { month: 'long' })
const MAX_FACES = 3

interface PosterArtProps {
  imageUrl: string | null
  tags: readonly string[] | null
  startDate: Date
  daysAway: number
  /** Les amis présents, en bas de l'affiche ; l'Explorer les pose sous le nom, d'où l'option. */
  friends?: Friend[]
  /** Le texte du coin haut gauche ; par défaut, le compte à rebours. */
  badge?: string | null
  action?: ReactNode
}

export function PosterArt({
  imageUrl,
  tags,
  startDate,
  daysAway,
  friends = [],
  badge,
  action,
}: PosterArtProps) {
  const corner = badge === undefined ? formatCountdown(daysAway) : badge
  const faces = friends.slice(0, MAX_FACES)
  const more = friends.length - faces.length

  return (
    <div className="poster-art">
      <Poster imageUrl={imageUrl} tags={tags} className="poster-art__poster">
        <span className="poster-art__day">{startDate.getDate()}</span>
        <span className="poster-art__month">{MONTH_LONG.format(startDate)}</span>
      </Poster>
      {corner && (
        <span
          className={
            badge === undefined
              ? 'poster-art__countdown'
              : 'poster-art__countdown poster-art__countdown--badge'
          }
        >
          {corner}
        </span>
      )}
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
