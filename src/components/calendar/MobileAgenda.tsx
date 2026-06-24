import { useMemo, type KeyboardEvent } from 'react'
import { Lock } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { eventPath } from '@/lib/event-link'
import { getTagIcon } from '@/components/ui/TagBadge'
import { SeasonGlyph } from './SeasonGlyph'
import { participationDot, type ActorKind } from '@/lib/explorer'
import { formatDateRange } from '@/lib/calendar-format'
import { avatarGradient } from '@/lib/avatar-gradient'
import type { CalendarMonth } from '@/hooks/use-calendar'
import type { FriendParticipation } from '@/hooks/use-participations'

interface MobileAgendaProps {
  months: CalendarMonth[]
  actorKind: ActorKind
  friendParticipations: FriendParticipation[]
  onOpenFriends: (eventId: string, eventName: string) => void
}

export function MobileAgenda({ months, actorKind, friendParticipations, onOpenFriends }: MobileAgendaProps) {
  const navigate = useNavigate()
  const now = useMemo(() => new Date(), [])

  // Cliquer un mois (plein ou vide) ouvre l'Explorer filtré sur ce mois précis.
  const openMonth = (m: CalendarMonth) => navigate('/explorer', { state: { month: { year: m.year, month: m.month } } })
  const monthNav = (m: CalendarMonth) => ({
    role: 'button' as const,
    tabIndex: 0,
    'aria-label': `Voir les festivals de ${m.label}`,
    onClick: () => openMonth(m),
    onKeyDown: (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMonth(m) } },
  })

  return (
    <div className="mobile-agenda">
      {months.map(month => {
        if (month.events.length === 0) {
          return (
            <div key={`${month.year}-${month.month}`} className="agenda-empty" {...monthNav(month)}>
              <SeasonGlyph month={month.month} size={14} />
              <span className="agenda-empty-nm">{month.label}</span>
              <span className="agenda-empty-lbl">libre</span>
            </div>
          )
        }
        const mineCount = month.events.filter(e => !e.isFriend).length
        return (
          <section key={`${month.year}-${month.month}`} className="agenda-month">
            <div className="agenda-mh" {...monthNav(month)}>
              <SeasonGlyph month={month.month} size={15} />
              <span className="agenda-mh-name">{month.label}</span>
              {mineCount > 0 && <span className="agenda-count">{mineCount} date{mineCount > 1 ? 's' : ''}</span>}
            </div>

            {month.events.map(ev => {
              if (ev.isFriend) {
                const fname = (ev.friendName ?? '').trim() || 'Un ami'
                return (
                  <Link key={ev.id} to={eventPath(ev)} state={{ from: '/calendrier' }} className="agenda-row friend">
                    <span className="agenda-fr-av" title={`Voir le profil de ${fname}`}
                      onClick={e => { e.preventDefault(); e.stopPropagation(); navigate(`/@${ev.friendSlug ?? ''}`) }}
                      style={ev.friendAvatarUrl ? undefined : { background: avatarGradient(fname) }}>
                      {ev.friendAvatarUrl ? <img src={ev.friendAvatarUrl} alt={fname} /> : fname[0]!.toUpperCase()}
                    </span>
                    <div className="agenda-row-info">
                      <div className="agenda-row-name">{ev.name}</div>
                      <div className="agenda-row-meta">{fname} y va · {formatDateRange(ev.startDate, ev.endDate)}</div>
                    </div>
                    <span className="calendar-event-tag-amis">amis</span>
                  </Link>
                )
              }
              const Icon = getTagIcon(ev.primaryTag)
              const dot = participationDot(ev.status, ev.paymentStatus, actorKind, { isPast: ev.endDate < now })
              const friendsAtEvent = friendParticipations.filter(fp => fp.event_id === ev.id)
              return (
                <div key={ev.id} className="agenda-event">
                  <Link to={eventPath(ev)} state={{ from: '/calendrier' }} className="agenda-row">
                    {ev.imageUrl
                      ? <div className="agenda-row-img"><img src={ev.imageUrl} alt="" /></div>
                      : <div className="agenda-row-img placeholder"><Icon size={14} strokeWidth={2} /></div>}
                    <div className="agenda-row-info">
                      <div className="agenda-row-name">{ev.name}{ev.isPrivate && <Lock className="inline h-3 w-3 opacity-70 ml-1" strokeWidth={2.2} />}</div>
                      <div className="agenda-row-meta">{formatDateRange(ev.startDate, ev.endDate)} · {ev.city}</div>
                    </div>
                    {dot && (
                      <span className="da-status calendar-status">
                        <span className="da-dot" style={{ ['--dot-color' as string]: dot.colorVar }} />{dot.label}
                      </span>
                    )}
                  </Link>
                  {friendsAtEvent.length > 0 && (
                    <button type="button" className="calendar-pav" onClick={() => onOpenFriends(ev.id, ev.name)}
                      aria-label={`${friendsAtEvent.length} compagnon(s) sur ${ev.name}`}>
                      {friendsAtEvent.slice(0, 3).map((fp, i) => {
                        const nm = (fp.actor_public?.label ?? '').trim() || '?'
                        const url = fp.actor_public?.avatar_url
                        return (
                          <span key={fp.actor_id} className="calendar-pav-item"
                            style={{ background: url ? 'transparent' : avatarGradient(nm), zIndex: 3 - i }}>
                            {url ? <img src={url} alt={nm} /> : nm[0].toUpperCase()}
                          </span>
                        )
                      })}
                    </button>
                  )}
                </div>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}
