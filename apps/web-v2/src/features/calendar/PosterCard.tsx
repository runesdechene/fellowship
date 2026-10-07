/**
 * QUOI     — une carte-affiche du calendrier : l'affiche, puis le nom, le statut et la plage.
 * POURQUOI — c'est l'élément fort de l'écran, comme sur la fiche : la couleur vient des affiches.
 * ATTENTION — le statut se lit par la FORME de l'icône ; ici « Inscrit » reste sobre (calendar.css).
 */
import { Check, CircleDashed, Contrast } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Chip, type ChipTone } from '@/components/ui/Chip'
import { PosterArt } from '@/components/ui/PosterArt'
import { formatDateRange } from '@/lib/dates'
import type { ParticipationStatus } from '@/types/database'
import type { CalendarDate } from './useCalendar'

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
  const muted = date.status === 'interesse'

  return (
    <Link
      to={`/evenement/${date.eventId}`}
      className={muted ? 'poster-card poster-card--muted' : 'poster-card'}
    >
      <PosterArt
        imageUrl={date.imageUrl}
        startDate={date.startDate}
        daysAway={date.daysAway}
        friends={date.friends}
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
      </div>
    </Link>
  )
}
