/**
 * QUOI     — la grande affiche d'une date : l'affiche (Poster.tsx ; absente, la fausse affiche de
 *            sa catégorie, à son nom), le compte à rebours en haut, les amis en bas.
 * POURQUOI — la même affiche vit dans le calendrier, la vitrine et l'Explorer ; sa hauteur vient du
 *            parent (`--poster-art-height`).
 * ATTENTION — `badge` remplace le compte à rebours (« Nouveau » dans l'Explorer) ; `action` se pose
 *            en haut à droite (l'étoile « Repérer ») ; `eventId` pose, sur une affiche absente, le
 *            bouton qui en ajoute une (AddPoster.tsx).
 */
import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { formatCountdown } from '@/lib/dates'
import { useState, type ReactNode } from 'react'
import { AddPoster } from '@/components/ui/AddPoster'
import { Poster, type PosterText } from '@/components/ui/Poster'
import type { Friend } from '@/lib/friends'

const MAX_FACES = 3

interface PosterArtProps {
  imageUrl: string | null
  tags: readonly string[] | null
  /** Ce qui s'écrit sur la fausse affiche quand la vraie manque. */
  cover: PosterText
  daysAway: number
  /** Les amis présents, en bas de l'affiche ; l'Explorer les pose sous le nom, d'où l'option. */
  friends?: Friend[]
  /** Le texte du coin haut gauche ; par défaut, le compte à rebours. */
  badge?: string | null
  action?: ReactNode
  /** La fiche à qui ajouter l'affiche, quand elle manque. */
  eventId?: string
}

export function PosterArt({
  imageUrl,
  tags,
  cover,
  daysAway,
  friends = [],
  badge,
  action,
  eventId,
}: PosterArtProps) {
  const [added, setAdded] = useState<string | null>(null)
  const poster = imageUrl ?? added
  const corner = badge === undefined ? formatCountdown(daysAway) : badge
  const faces = friends.slice(0, MAX_FACES)
  const more = friends.length - faces.length

  return (
    <div className="poster-art">
      <Poster imageUrl={poster} tags={tags} cover={cover} className="poster-art__poster" />
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
      {eventId && !poster && <AddPoster eventId={eventId} onAdded={setAdded} />}
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
