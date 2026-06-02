import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { eventPath } from '@/lib/event-link'
import { MonthBanner } from './MonthBanner'
import { useTags } from '@/hooks/use-tags'
import { getTagIcon } from '@/components/ui/TagBadge'
import { participationChip, type ActorKind } from '@/lib/explorer'
import type { CalendarMonth as CalendarMonthType, CalendarEvent } from '@/hooks/use-calendar'
import type { FriendParticipation } from '@/hooks/use-participations'
import { avatarGradient } from '@/lib/avatar-gradient'

function useTagColor() {
  const { tags } = useTags()
  return (slug: string) => {
    const t = tags.find(t => t.value === slug)
    return t ? { bg: t.bg, color: t.color } : { bg: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }
  }
}

interface CalendarMonthProps {
  data: CalendarMonthType
  actorKind: ActorKind
  friendParticipations?: FriendParticipation[]
  onOpenFriends?: (eventId: string, eventName: string) => void
}

export function CalendarMonth({ data, actorKind, friendParticipations = [], onOpenFriends }: CalendarMonthProps) {
  const { month, label, events } = data
  const getTagColor = useTagColor()
  const now = new Date()

  const mine = events.filter(e => !e.isFriend)
  const friendsOnly = events.filter(e => e.isFriend)
  const isEmpty = events.length === 0

  const dayCount = (ev: CalendarEvent) =>
    Math.max(1, Math.round((ev.endDate.getTime() - ev.startDate.getTime()) / 86400000) + 1)

  return (
    <div>
      <MonthBanner month={month} label={label} year={data.year} />

      {isEmpty && <div className="calendar-month-empty-note">Ce mois est libre</div>}

      {mine.map(ev => {
        const tc = getTagColor(ev.primaryTag)
        const I = getTagIcon(ev.primaryTag)
        const isPast = ev.endDate < now
        const chip = participationChip(ev.status, ev.paymentStatus, actorKind, { isPast })
        const friendsAtEvent = friendParticipations.filter(fp => fp.event_id === ev.id)
        const days = dayCount(ev)
        return (
          <div key={ev.id} className="calendar-event-wrapper">
            <Link to={eventPath(ev)} state={{ from: '/calendrier' }} className="calendar-event-row">
              {ev.imageUrl && (
                <div className="calendar-event-image"><img src={ev.imageUrl} alt="" /></div>
              )}
              <div className="calendar-event-info">
                <div className="calendar-event-name">{ev.name}</div>
                <span className="calendar-event-tag" style={{ background: tc.bg, color: tc.color }}>
                  <I size={10} strokeWidth={2} />{ev.primaryTag}
                </span>
                <div className="calendar-event-meta">
                  <MapPin /><span>{ev.city} ({ev.department})</span><span>—</span>
                  <span>{days} jour{days > 1 ? 's' : ''}</span>
                </div>
              </div>
              {chip && <span className={'calendar-evst ' + chip.variant}>{chip.label}</span>}
              <div className="calendar-event-date">
                <b>{ev.startDate.getDate()}</b>
                <span>{ev.startDate.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span>
              </div>
            </Link>

            {friendsAtEvent.length > 0 && (
              <button className="calendar-companions" onClick={e => { e.preventDefault(); onOpenFriends?.(ev.id, ev.name) }}>
                <div className="calendar-pav">
                  {friendsAtEvent.slice(0, 4).map((fp, i) => {
                    // ?? + || : un label '' (DB autorise les brand_name vides en legacy)
                    // passe le ?? donc on enchaîne || pour retomber sur '?' aussi.
                    const nm = (fp.actor_public?.label ?? '').trim() || '?'
                    const url = fp.actor_public?.avatar_url
                    return (
                      <span key={fp.actor_id} className="calendar-pav-item"
                        style={{ background: url ? 'transparent' : avatarGradient(nm), zIndex: 4 - i }}>
                        {url ? <img src={url} alt={nm} /> : nm[0]!.toUpperCase()}
                      </span>
                    )
                  })}
                </div>
                <span>{friendsAtEvent.length} compagnon{friendsAtEvent.length > 1 ? 's' : ''} sur cette date</span>
              </button>
            )}
          </div>
        )
      })}

      {friendsOnly.length > 0 && (
        <>
          <div className="calendar-friend-lbl">Tes compagnons ce mois-ci</div>
          {friendsOnly.map(ev => {
            const fname = (ev.friendName ?? '').trim() || 'Un ami'
            return (
              <Link key={ev.id} to={eventPath(ev)} state={{ from: '/calendrier' }} className="calendar-evF">
                {ev.imageUrl && <img src={ev.imageUrl} alt="" />}
                <div className="calendar-evF-info">
                  <div className="calendar-evF-name">{ev.name}</div>
                  <div className="calendar-evF-meta">{fname} y va · {ev.startDate.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</div>
                </div>
                <span className="calendar-evF-av" style={{ background: avatarGradient(fname) }}>{fname[0]!.toUpperCase()}</span>
              </Link>
            )
          })}
        </>
      )}
    </div>
  )
}
