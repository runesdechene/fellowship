/**
 * QUOI     — une carte-affiche du calendrier : l'affiche, puis le nom, le statut et la plage.
 * POURQUOI — c'est l'élément fort de l'écran, comme sur la fiche : la couleur vient des affiches.
 *            Les amis présents ne sont pas sur l'affiche : visages et noms sous la date, comme dans
 *            l'Explorer (Uriel, 19/10/2026).
 * ATTENTION — le statut se lit par la FORME de l'icône et sa couleur, la même que partout ailleurs.
 */
import { Check, CircleDashed, FolderInput } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { Chip, type ChipTone } from '@/components/ui/Chip'
import { PosterArt } from '@/components/ui/PosterArt'
import { formatDateRange } from '@/lib/dates'
import { nameLine } from '@/lib/name-line'
import type { ParticipationStatus } from '@/types/database'
import type { CalendarDate } from './useCalendar'

const STATUS: Record<ParticipationStatus, { label: string; tone: ChipTone; icon: typeof Check }> = {
  interesse: { label: 'Intéressé', tone: 'todo', icon: CircleDashed },
  en_cours: { label: 'Dossier envoyé', tone: 'sent', icon: FolderInput },
  inscrit: { label: 'Inscrit', tone: 'ok', icon: Check },
  confirme: { label: 'Inscrit', tone: 'ok', icon: Check },
  refuse: { label: 'Refusé', tone: 'neutral', icon: CircleDashed },
}

const MAX_FACES = 3

export function PosterCard({ date }: { date: CalendarDate }) {
  const status = STATUS[date.status]
  const StatusIcon = status.icon
  const muted = date.status === 'interesse'
  const goers = nameLine(
    date.friends.map((friend) => friend.name),
    { one: 'y va', many: 'y vont' },
  )

  return (
    <Link
      to={`/evenement/${date.eventId}`}
      className={muted ? 'poster-card poster-card--muted' : 'poster-card'}
    >
      <PosterArt
        eventId={date.eventId}
        imageUrl={date.imageUrl}
        tags={date.tags}
        startDate={date.startDate}
        daysAway={date.daysAway}
      />
      <div className="poster-card__info">
        <div className="poster-card__row">
          <span className="poster-card__name">{date.name}</span>
          <Chip tone={status.tone} icon={<StatusIcon size={12} strokeWidth={2.4} />}>
            {status.label}
          </Chip>
        </div>
        <span className="poster-card__meta">
          {formatDateRange(date.startDate, date.endDate)} · {date.place}
        </span>
        {goers && (
          <span className="poster-card__friends">
            <AvatarStack>
              {date.friends.slice(0, MAX_FACES).map((friend) => (
                <Avatar
                  key={friend.id}
                  className="poster-card__face"
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
      </div>
    </Link>
  )
}
