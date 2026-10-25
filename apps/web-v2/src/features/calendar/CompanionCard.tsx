/**
 * QUOI     — un festival où vont des amis, en mini-carte : la vignette d'affiche, le nom, les
 *            dates, qui y va, et la pile d'avatars.
 * POURQUOI — Uriel, 11/10/2026 : l'ancienne liste de compagnons était « extrêmement moche » ; la
 *            maquette Figma 2238:2 (mini-cartes) a été retenue. Un clic ouvre la fiche.
 */
import { Link } from 'react-router-dom'
import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { Poster } from '@/components/ui/Poster'
import { formatDateRange } from '@/lib/dates'
import type { CalendarCompanion } from './useCalendar'
import { eventPath } from '@/lib/event-path'

const MAX_FACES = 3

export function CompanionCard({ companion }: { companion: CalendarCompanion }) {
  const first = companion.friends[0]
  if (!first) return null
  const others = companion.friends.length - 1

  return (
    <Link to={eventPath(companion.eventId)} className="companion-card">
      <Poster
        imageUrl={companion.imageUrl}
        tags={companion.tags}
        className="companion-card__poster"
      />
      <span className="companion-card__body">
        <span className="companion-card__name">{companion.name}</span>
        <span className="companion-card__meta">
          {formatDateRange(companion.startDate, companion.endDate)}
        </span>
        <span className="companion-card__meta">
          {others > 0
            ? `${first.name} et ${others} ${others === 1 ? 'autre' : 'autres'}`
            : first.name}
        </span>
      </span>
      <AvatarStack>
        {companion.friends.slice(0, MAX_FACES).map((friend) => (
          <Avatar
            key={friend.id}
            className="companion-card__face"
            src={friend.avatarUrl}
            name={friend.name}
          />
        ))}
      </AvatarStack>
    </Link>
  )
}
