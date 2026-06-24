import { Link, useNavigate } from 'react-router-dom'
import { MapPin, Lock } from 'lucide-react'
import { eventPath } from '@/lib/event-link'
import { SeasonGlyph } from './SeasonGlyph'
import { getTagIcon } from '@/components/ui/TagBadge'
import { participationDot, type ActorKind } from '@/lib/explorer'
import { formatDateRange } from '@/lib/calendar-format'
import type { CalendarMonth as CalendarMonthType, CalendarEvent } from '@/hooks/use-calendar'
import type { FriendParticipation } from '@/hooks/use-participations'
import { avatarGradient } from '@/lib/avatar-gradient'

interface CalendarMonthProps {
  data: CalendarMonthType
  actorKind: ActorKind
  friendParticipations?: FriendParticipation[]
  onOpenFriends?: (eventId: string, eventName: string) => void
}

export function CalendarMonth({ data, actorKind, friendParticipations = [], onOpenFriends }: CalendarMonthProps) {
  const { month, label, events } = data
  const navigate = useNavigate()
  const now = new Date()
  const isEmpty = events.length === 0
  const mineCount = events.filter(e => !e.isFriend).length
  const friendCount = events.length - mineCount

  const dayCount = (ev: CalendarEvent) =>
    Math.max(1, Math.round((ev.endDate.getTime() - ev.startDate.getTime()) / 86400000) + 1)

  return (
    <>
      <div className="calendar-month-head">
        <SeasonGlyph month={month} />
        <span className="calendar-month-name">{label}</span>
        <span className="calendar-month-count">
          {isEmpty ? 'libre'
            : friendCount > 0 ? `${mineCount} · ${friendCount} ami${friendCount > 1 ? 's' : ''}`
            : `${mineCount} date${mineCount > 1 ? 's' : ''}`}
        </span>
      </div>

      {events.map(ev => {
        // Date amie (fusion chronologique) : ligne atténuée, avatar, pas de point statut.
        if (ev.isFriend) {
          const fname = (ev.friendName ?? '').trim() || 'Un ami'
          return (
            <Link key={ev.id} to={eventPath(ev)} state={{ from: '/calendrier' }} className="calendar-event-row friend">
              <span className="calendar-event-av"
                title={`Voir le profil de ${fname}`}
                onClick={e => { e.preventDefault(); e.stopPropagation(); navigate(`/@${ev.friendSlug ?? ''}`) }}
                style={ev.friendAvatarUrl ? undefined : { background: avatarGradient(fname) }}>
                {ev.friendAvatarUrl ? <img src={ev.friendAvatarUrl} alt={fname} /> : fname[0]!.toUpperCase()}
              </span>
              <div className="calendar-event-info">
                <div className="calendar-event-name">{ev.name}</div>
                <div className="calendar-event-meta">{fname} y va · {formatDateRange(ev.startDate, ev.endDate)}</div>
              </div>
              <span className="calendar-event-tag-amis">amis</span>
            </Link>
          )
        }

        // Ma date.
        const I = getTagIcon(ev.primaryTag)
        const isPast = ev.endDate < now
        const dot = participationDot(ev.status, ev.paymentStatus, actorKind, { isPast })
        const friendsAtEvent = friendParticipations.filter(fp => fp.event_id === ev.id)
        const days = dayCount(ev)
        return (
          <div key={ev.id} className="calendar-event-wrapper">
            <Link to={eventPath(ev)} state={{ from: '/calendrier' }} className="calendar-event-row">
              {ev.imageUrl
                ? <div className="calendar-event-image"><img src={ev.imageUrl} alt="" /></div>
                : <div className="calendar-event-image placeholder"><I size={14} strokeWidth={2} /></div>}
              <div className="calendar-event-info">
                <div className="calendar-event-name">{ev.name}{ev.isPrivate && <Lock className="inline h-3 w-3 opacity-70 ml-1" strokeWidth={2.2} />}</div>
                <div className="calendar-event-meta">
                  <MapPin size={11} strokeWidth={2} /><span>{ev.city}{ev.department ? ` (${ev.department})` : ''}</span>
                  <span>·</span><span>{ev.startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', '')}</span>
                  {days > 1 && <><span>·</span><span>{days} j</span></>}
                </div>
              </div>
              {friendsAtEvent.length > 0 && (
                <button className="calendar-pav" onClick={e => { e.preventDefault(); onOpenFriends?.(ev.id, ev.name) }}
                  aria-label={`${friendsAtEvent.length} compagnon(s) sur cette date`}>
                  {friendsAtEvent.slice(0, 3).map((fp, i) => {
                    const nm = (fp.actor_public?.label ?? '').trim() || '?'
                    const url = fp.actor_public?.avatar_url
                    return (
                      <span key={fp.actor_id} className="calendar-pav-item"
                        style={{ background: url ? 'transparent' : avatarGradient(nm), zIndex: 3 - i }}>
                        {url ? <img src={url} alt={nm} /> : nm[0]!.toUpperCase()}
                      </span>
                    )
                  })}
                </button>
              )}
              {dot && (
                <span className="da-status calendar-status">
                  <span className="da-dot" style={{ ['--dot-color' as string]: dot.colorVar }} />
                  {dot.label}
                </span>
              )}
            </Link>
          </div>
        )
      })}
    </>
  )
}
