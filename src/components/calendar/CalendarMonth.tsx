import { Link } from 'react-router-dom'
import { MapPin, Check, HelpCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { MonthBanner } from './MonthBanner'
import { useTags } from '@/hooks/use-tags'
import { getTagIcon } from '@/components/ui/TagBadge'
import type { CalendarMonth as CalendarMonthType } from '@/hooks/use-calendar'
import type { FriendParticipation } from '@/hooks/use-participations'

function useTagColor() {
  const { tags } = useTags()
  return (slug: string) => {
    const t = tags.find(t => t.value === slug)
    return t ? { bg: t.bg, color: t.color } : { bg: 'rgba(61,48,40,0.06)', color: 'rgba(61,48,40,0.45)' }
  }
}

const AVATAR_GRADIENTS = [
  ['#f0a060', '#e74c3c'],
  ['#6c5ce7', '#a29bfe'],
  ['#00b894', '#00cec9'],
  ['#fd79a8', '#e84393'],
  ['#f39c12', '#d68910'],
]

function hashName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
  return Math.abs(h)
}


const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: typeof Check }> = {
  inscrit: { color: 'hsl(152 50% 38%)', bg: 'hsl(152 50% 38% / 0.1)', icon: Check },
  en_cours: { color: 'hsl(210 60% 50%)', bg: 'hsl(210 60% 50% / 0.1)', icon: HelpCircle },
  interesse: { color: 'hsl(30 80% 50%)', bg: 'hsl(30 80% 50% / 0.1)', icon: HelpCircle },
}

interface CalendarMonthProps {
  data: CalendarMonthType
  friendParticipations?: FriendParticipation[]
  onOpenFriends?: (eventId: string, eventName: string) => void
}

export function CalendarMonth({ data, friendParticipations = [], onOpenFriends }: CalendarMonthProps) {
  const { month, label, events } = data
  const { profile } = useAuth()
  const getTagColor = useTagColor()
  const isEmpty = events.length === 0
  const displayName = profile?.brand_name ?? profile?.display_name ?? 'Moi'

  return (
    <div>
      {/* Month banner */}
      <MonthBanner month={month} label={label} year={data.year} />

      {/* Event cards — portrait image left */}
      {!isEmpty && events.map(ev => {
        const friendsAtEvent = friendParticipations.filter(fp => fp.event_id === ev.id)
        const statusCfg = STATUS_CONFIG[ev.status] ?? STATUS_CONFIG.interesse

        const days = Math.max(1, Math.round((ev.endDate.getTime() - ev.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)

        return (
          <div key={ev.id} className="calendar-event-wrapper">
            <Link
              to={`/evenement/${ev.id}`}
              state={{ from: '/calendrier' }}
              className="calendar-event-row"
              style={{ background: getTagColor(ev.primaryTag).bg }}
            >
              {/* Portrait image — only if available */}
              {ev.imageUrl && (
                <div className="calendar-event-image">
                  <img src={ev.imageUrl} alt="" />
                </div>
              )}

              {/* Info */}
              <div className="calendar-event-info">
                <div className="calendar-event-top">
                  <div className="calendar-event-details">
                    <div className="calendar-event-name">{ev.name}</div>
                    {(() => { const I = getTagIcon(ev.primaryTag); const tc = getTagColor(ev.primaryTag); return (
                      <span
                        className="calendar-event-tag inline-flex items-center gap-1"
                        style={{ background: tc.bg, color: tc.color }}
                      ><I size={10} strokeWidth={2} />{ev.primaryTag}</span>
                    ) })()}
                    <div className="calendar-event-meta">
                      <MapPin />
                      <span>{ev.city} ({ev.department})</span>
                      <span>—</span>
                      <span>{days} jour{days > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="calendar-event-date">
                    <span className="calendar-event-day" style={{ color: getTagColor(ev.primaryTag).color }}>{ev.startDate.getDate()}</span>
                    <span className="calendar-event-month" style={{ color: getTagColor(ev.primaryTag).color, opacity: 0.6 }}>{ev.startDate.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span>
                  </div>
                </div>
              </div>
            </Link>

            {/* Participants — below the card */}
            <div className="calendar-presence-row">
              {ev.isFriend ? (
                /* Friend's event — show ALL friends who participate */
                (() => {
                  const fps = friendParticipations.filter(f => f.event_id === ev.id)
                  return (
                    <button
                      className="calendar-presence-friends calendar-presence-clickable"
                      onClick={e => { e.preventDefault(); onOpenFriends?.(ev.id, ev.name) }}
                    >
                      <div className="presence-avatars">
                        {fps.slice(0, 4).map((fp, i) => {
                          const name = fp.profiles?.brand_name ?? fp.profiles?.display_name ?? '?'
                          const avatarUrl = fp.profiles?.avatar_url
                          const [from, to] = AVATAR_GRADIENTS[hashName(name) % AVATAR_GRADIENTS.length]
                          return (
                            <span
                              key={fp.id}
                              className="presence-avatar"
                              style={{ background: avatarUrl ? 'transparent' : `linear-gradient(135deg, ${from}, ${to})`, zIndex: 4 - i, overflow: 'hidden' }}
                              title={name}
                            >
                              {avatarUrl ? (
                                <img src={avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                name[0].toUpperCase()
                              )}
                            </span>
                          )
                        })}
                      </div>
                      <span className="calendar-presence-friends-names">
                        {fps.map(f => f.profiles?.brand_name ?? f.profiles?.display_name ?? '?').join(', ')}
                      </span>
                    </button>
                  )
                })()
              ) : (
                /* My event — show my presence */
                <div
                  className="calendar-presence-me"
                  style={{ background: statusCfg.bg, color: statusCfg.color }}
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="calendar-presence-avatar-img" />
                  ) : (
                    <div
                      className="calendar-presence-avatar-letter"
                      style={{ background: statusCfg.color }}
                    >
                      {displayName[0].toUpperCase()}
                    </div>
                  )}
                  <statusCfg.icon style={{ width: 10, height: 10 }} strokeWidth={2.5} />
                  <span>{displayName}</span>
                </div>
              )}

              {/* Friends on my events */}
              {!ev.isFriend && friendsAtEvent.length > 0 && (
                <button
                  className="calendar-presence-friends calendar-presence-clickable"
                  onClick={e => { e.preventDefault(); onOpenFriends?.(ev.id, ev.name) }}
                >
                  <div className="presence-avatars">
                    {friendsAtEvent.slice(0, 3).map((fp, i) => {
                      const name = fp.profiles?.brand_name ?? fp.profiles?.display_name ?? '?'
                      const avatarUrl = fp.profiles?.avatar_url
                      const [from, to] = AVATAR_GRADIENTS[hashName(name) % AVATAR_GRADIENTS.length]
                      return (
                        <span
                          key={fp.id}
                          className="presence-avatar"
                          style={{ background: avatarUrl ? 'transparent' : `linear-gradient(135deg, ${from}, ${to})`, zIndex: 3 - i, overflow: 'hidden' }}
                          title={name}
                        >
                          {avatarUrl ? (
                            <img src={avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            name[0].toUpperCase()
                          )}
                        </span>
                      )
                    })}
                  </div>
                  <span className="calendar-presence-friends-names">
                    {friendsAtEvent.length} ami{friendsAtEvent.length > 1 ? 's' : ''}
                  </span>
                </button>
              )}
            </div>
          </div>
        )
      })}

    </div>
  )
}
