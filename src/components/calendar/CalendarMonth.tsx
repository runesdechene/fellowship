import { Link } from 'react-router-dom'
import { MapPin, Check, HelpCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { MonthBanner } from './MonthBanner'
import type { CalendarMonth as CalendarMonthType } from '@/hooks/use-calendar'
import type { FriendParticipation } from '@/hooks/use-participations'

const TAG_COLORS: Record<string, { bg: string; color: string }> = {
  'médiéval': { bg: 'hsl(24 72% 44% / 0.1)', color: 'hsl(24 72% 50%)' },
  'fantastique': { bg: 'hsl(280 50% 55% / 0.1)', color: 'hsl(280 50% 55%)' },
  'geek': { bg: 'hsl(220 70% 50% / 0.1)', color: 'hsl(220 70% 50%)' },
  'marché': { bg: 'hsl(152 32% 40% / 0.1)', color: 'hsl(152 32% 45%)' },
  'salon': { bg: 'hsl(200 50% 45% / 0.1)', color: 'hsl(200 50% 45%)' },
  'foire': { bg: 'hsl(40 80% 50% / 0.1)', color: 'hsl(40 70% 40%)' },
  'musique': { bg: 'hsl(340 60% 55% / 0.1)', color: 'hsl(340 55% 50%)' },
  'littéraire': { bg: 'hsl(190 60% 45% / 0.1)', color: 'hsl(190 60% 40%)' },
  'historique': { bg: 'hsl(10 70% 50% / 0.1)', color: 'hsl(10 70% 45%)' },
}

function getTagColor(tag: string) {
  const key = Object.keys(TAG_COLORS).find(k => tag.toLowerCase().includes(k))
  return key ? TAG_COLORS[key] : { bg: 'rgba(61,48,40,0.06)', color: 'rgba(61,48,40,0.45)' }
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
                    <span
                      className="calendar-event-tag"
                      style={{ background: getTagColor(ev.primaryTag).bg, color: getTagColor(ev.primaryTag).color }}
                    >{ev.primaryTag}</span>
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
