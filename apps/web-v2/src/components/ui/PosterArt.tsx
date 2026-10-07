/**
 * QUOI     — l'affiche d'une date : l'image (ou la grande date en serif quand il n'y en a pas), le
 *            compte à rebours en haut, les amis présents en bas.
 * POURQUOI — la même affiche vit dans le calendrier et dans la vitrine ; sa hauteur vient du parent
 *            (`--poster-art-height`).
 */
import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { formatCountdown } from '@/lib/dates'
import type { Friend } from '@/lib/friends'

const MONTH_LONG = new Intl.DateTimeFormat('fr-FR', { month: 'long' })
const MAX_FACES = 3

interface PosterArtProps {
  imageUrl: string | null
  startDate: Date
  daysAway: number
  friends: Friend[]
}

export function PosterArt({ imageUrl, startDate, daysAway, friends }: PosterArtProps) {
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
      <span className="poster-art__countdown">{formatCountdown(daysAway)}</span>
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
