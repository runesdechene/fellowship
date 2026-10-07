import { Link, useNavigate } from 'react-router-dom'
import { MapPin, Lock } from 'lucide-react'
import { eventPath } from '@/lib/event-link'
import { MonthBanner } from './MonthBanner'
import { useTags } from '@/hooks/use-tags'
import { getTagIcon } from '@/components/ui/TagBadge'
import { participationDot, type ActorKind } from '@/lib/explorer'
import { formatDateRange } from '@/lib/calendar-format'
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
  const navigate = useNavigate()
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
        const dot = participationDot(ev.status, ev.paymentStatus, actorKind, { isPast })
        const friendsAtEvent = friendParticipations.filter(fp => fp.event_id === ev.id)
        const days = dayCount(ev)
        return (
          <div key={ev.id} className="calendar-event-wrapper">
            <Link to={eventPath(ev)} state={{ from: '/calendrier' }} className={`glass-card calendar-event-row${isPast ? ' past' : ''}`}>
              {ev.imageUrl && (
                <div className="calendar-event-image"><img src={ev.imageUrl} alt="" /></div>
              )}
              <div className="calendar-event-info">
                <div className="calendar-event-name">{ev.name}{ev.isPrivate && <Lock className="inline h-3 w-3 opacity-70 ml-1" strokeWidth={2.2} />}</div>
                <span className="calendar-event-tag" style={{ background: tc.bg, color: tc.color }}>
                  <I size={10} strokeWidth={2} />{ev.primaryTag}
                </span>
                <div className="calendar-event-meta">
                  <MapPin /><span>{ev.city} ({ev.department})</span><span>—</span>
                  <span>{days} jour{days > 1 ? 's' : ''}</span>
                </div>
              </div>
              {(friendsAtEvent.length > 0 || dot) && (
                <div className="calendar-event-end">
                  {friendsAtEvent.length > 0 && (
                    <span
                      className="calendar-pav"
                      role="button"
                      tabIndex={0}
                      title={`${friendsAtEvent.length} compagnon${friendsAtEvent.length > 1 ? 's' : ''} sur cette date`}
                      onClick={e => { e.preventDefault(); e.stopPropagation(); onOpenFriends?.(ev.id, ev.name) }}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onOpenFriends?.(ev.id, ev.name) } }}
                    >
                      {friendsAtEvent.slice(0, 3).map((fp, i) => {
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
                    </span>
                  )}
                  {dot && (
                    <span className="calendar-status da-status" style={{ ['--dot-color' as string]: dot.colorVar }}>
                      <span className="da-dot" />{dot.label}
                    </span>
                  )}
                </div>
              )}
              <div className="calendar-event-date">
                <b>{ev.startDate.getDate()}</b>
                <span>{ev.startDate.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span>
              </div>
            </Link>
          </div>
        )
      })}

      {friendsOnly.length > 0 && (
        <>
          <div className="calendar-friend-lbl">Tes compagnons ce mois-ci</div>
          {friendsOnly.map(ev => {
            const friends = ev.friends && ev.friends.length > 0
              ? ev.friends
              : [{ name: (ev.friendName ?? '').trim() || 'Un ami', avatarUrl: ev.friendAvatarUrl ?? null, slug: ev.friendSlug ?? '' }]
            const names = friends.map(f => f.name).join(', ')
            const isPast = ev.endDate < now
            // Participe invariable (« a/ont été ») : pas d'accord de genre à deviner.
            const verb = isPast
              ? (friends.length > 1 ? 'y ont été' : 'y a été')
              : (friends.length > 1 ? 'y vont' : 'y va')
            return (
              <Link key={ev.id} to={eventPath(ev)} state={{ from: '/calendrier' }} className={`calendar-evF${isPast ? ' past' : ''}`}>
                {ev.imageUrl && <img src={ev.imageUrl} alt="" />}
                <div className="calendar-evF-info">
                  <div className="calendar-evF-name">{ev.name}{isPast && <span className="cal-past-badge">Passé</span>}</div>
                  <div className="calendar-evF-meta">{names} {verb} · {formatDateRange(ev.startDate, ev.endDate)}</div>
                </div>
                <span className="calendar-pav calendar-evF-pile">
                  {friends.slice(0, 3).map((f, i) => (
                    <span key={f.slug || i} className="calendar-pav-item"
                      role="button" tabIndex={0}
                      title={`Voir le profil de ${f.name}`}
                      onClick={e => { e.preventDefault(); e.stopPropagation(); navigate(`/@${f.slug}`) }}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); navigate(`/@${f.slug}`) } }}
                      style={{ background: f.avatarUrl ? 'transparent' : avatarGradient(f.name), zIndex: 4 - i }}>
                      {f.avatarUrl ? <img src={f.avatarUrl} alt={f.name} /> : f.name[0]!.toUpperCase()}
                    </span>
                  ))}
                  {friends.length > 3 && <span className="calendar-evF-more">+{friends.length - 3}</span>}
                </span>
              </Link>
            )
          })}
        </>
      )}
    </div>
  )
}
