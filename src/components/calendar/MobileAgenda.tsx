import { useMemo, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { eventPath } from '@/lib/event-link'
import { useTags } from '@/hooks/use-tags'
import { getTagIcon } from '@/components/ui/TagBadge'
import { MonthBanner } from './MonthBanner'
import { participationChip, type ActorKind } from '@/lib/explorer'
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

function useTagStyle() {
  const { tags } = useTags()
  return (slug: string) => {
    const t = tags.find(t => t.value === slug)
    return t ? { bg: t.bg, color: t.color } : { bg: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }
  }
}

export function MobileAgenda({ months, actorKind, friendParticipations, onOpenFriends }: MobileAgendaProps) {
  const getTagStyle = useTagStyle()
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
              <span className="agenda-empty-nm">{month.label}</span>
              <span className="agenda-empty-lbl">libre</span>
            </div>
          )
        }

        const mine = month.events.filter(e => !e.isFriend)
        const friendsOnly = month.events.filter(e => e.isFriend)

        return (
          <section key={`${month.year}-${month.month}`} className="agenda-month">
            <div className="agenda-mh" {...monthNav(month)}>
              <MonthBanner month={month.month} label={month.label} year={month.year} />
              {mine.length > 0 && (
                <span className="agenda-count">{mine.length} date{mine.length > 1 ? 's' : ''}</span>
              )}
            </div>

            {mine.map(ev => {
              const tagStyle = getTagStyle(ev.primaryTag)
              const chip = participationChip(ev.status, ev.paymentStatus, actorKind, { isPast: ev.endDate < now })
              const friendsAtEvent = friendParticipations.filter(fp => fp.event_id === ev.id)
              const Icon = getTagIcon(ev.primaryTag)
              return (
                <div key={ev.id} className="agenda-event">
                  <Link
                    to={eventPath(ev)}
                    state={{ from: '/calendrier' }}
                    className="mobile-event-pill"
                    style={{ background: tagStyle.bg }}
                  >
                    {ev.imageUrl && (
                      <div className="mobile-event-pill-img"><img src={ev.imageUrl} alt="" /></div>
                    )}
                    <div className="mobile-event-pill-info">
                      <div className="mobile-event-pill-name">
                        <Icon size={12} strokeWidth={2} className="inline -mt-px shrink-0" />{' '}{ev.name}
                      </div>
                      <div className="mobile-event-pill-meta">
                        <span>{formatDateRange(ev.startDate, ev.endDate)}</span>
                        <span>·</span>
                        <span>{ev.city} ({ev.department})</span>
                      </div>
                    </div>
                    {chip && (
                      <div className={'mobile-event-pill-status ' + chip.variant} title={chip.label}>
                        {chip.label}
                      </div>
                    )}
                  </Link>

                  {friendsAtEvent.length > 0 && (
                    <button
                      type="button"
                      className="agenda-companions"
                      aria-label={`Voir les ${friendsAtEvent.length} compagnon${friendsAtEvent.length > 1 ? 's' : ''} sur ${ev.name}`}
                      onClick={() => onOpenFriends(ev.id, ev.name)}
                    >
                      <div className="agenda-pav">
                        {friendsAtEvent.slice(0, 4).map((fp, i) => {
                          const nm = fp.actor_public?.label ?? '?'
                          const url = fp.actor_public?.avatar_url
                          return (
                            <span key={fp.actor_id} className="agenda-pav-item"
                              style={{ background: url ? 'transparent' : avatarGradient(nm), zIndex: 4 - i }}>
                              {url ? <img src={url} alt={nm} /> : nm[0].toUpperCase()}
                            </span>
                          )
                        })}
                      </div>
                      <span>{friendsAtEvent.length} compagnon{friendsAtEvent.length > 1 ? 's' : ''}</span>
                    </button>
                  )}
                </div>
              )
            })}

            {friendsOnly.length > 0 && (
              <>
                <div className="agenda-frlbl">Tes compagnons</div>
                {friendsOnly.map(ev => {
                  const fname = ev.friendName ?? 'Un ami'
                  return (
                    <Link key={ev.id} to={eventPath(ev)} state={{ from: '/calendrier' }} className="mobile-event-pill fr">
                      <span className="agenda-fr-av" style={{ background: avatarGradient(fname) }}>{fname[0].toUpperCase()}</span>
                      <div className="mobile-event-pill-info">
                        <div className="mobile-event-pill-name">{ev.name}</div>
                        <div className="mobile-event-pill-meta">
                          <span>{fname} y va</span>
                          <span>·</span>
                          <span>{formatDateRange(ev.startDate, ev.endDate)}</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </>
            )}
          </section>
        )
      })}
    </div>
  )
}
