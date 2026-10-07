/**
 * QUOI     — une carte-affiche du calendrier : l'affiche (ou la grande date en serif quand il n'y en
 *            a pas), le compte à rebours, les amis présents, puis le nom, le statut et la plage.
 * POURQUOI — c'est l'élément fort de l'écran, comme sur la fiche : la couleur vient des affiches.
 * ATTENTION — le statut se lit par la FORME de l'icône ; seul « Inscrit » porte la terre du logo.
 */
import { Check, CircleDashed, Contrast } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { Chip, type ChipTone } from '@/components/ui/Chip'
import { formatDateRange } from '@/lib/calendar'
import { formatCountdown } from '@/lib/dates'
import type { ParticipationStatus } from '@/types/database'
import type { CalendarDate } from './useCalendar'

const MONTH_SHORT = new Intl.DateTimeFormat('fr-FR', { month: 'long' })
const MAX_FACES = 3

const STATUS: Record<ParticipationStatus, { label: string; tone: ChipTone; icon: typeof Check }> = {
  interesse: { label: 'Intéressé', tone: 'todo', icon: CircleDashed },
  en_cours: { label: 'Dossier envoyé', tone: 'pending', icon: Contrast },
  inscrit: { label: 'Inscrit', tone: 'ok', icon: Check },
  confirme: { label: 'Inscrit', tone: 'ok', icon: Check },
  refuse: { label: 'Refusé', tone: 'neutral', icon: CircleDashed },
}

export function PosterCard({ date }: { date: CalendarDate }) {
  const status = STATUS[date.status]
  const StatusIcon = status.icon
  const faces = date.friends.slice(0, MAX_FACES)
  const more = date.friends.length - faces.length
  const muted = date.status === 'interesse'

  return (
    <Link
      to={`/evenement/${date.eventId}`}
      className={muted ? 'poster-card poster-card--muted' : 'poster-card'}
    >
      <div className="poster-card__art">
        {date.imageUrl ? (
          <img className="poster-card__image" src={date.imageUrl} alt="" />
        ) : (
          <div
            className="poster-card__fallback"
            style={date.tag ? ({ '--tag-ink': date.tag.textColor } as CSSProperties) : undefined}
          >
            <span className="poster-card__day">{date.startDate.getDate()}</span>
            <span className="poster-card__month">{MONTH_SHORT.format(date.startDate)}</span>
          </div>
        )}
        <span className="poster-card__countdown">{formatCountdown(date.daysAway)}</span>
        {faces.length > 0 && (
          <span className="poster-card__friends">
            <AvatarStack>
              {faces.map((friend) => (
                <Avatar
                  key={friend.id}
                  className="poster-card__face"
                  src={friend.avatarUrl}
                  name={friend.name}
                />
              ))}
            </AvatarStack>
            {more > 0 && <span className="poster-card__more">+{more}</span>}
          </span>
        )}
      </div>
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
      </div>
    </Link>
  )
}
