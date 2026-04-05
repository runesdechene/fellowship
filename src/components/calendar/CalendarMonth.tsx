import { Link } from 'react-router-dom'
import { MapPin, Calendar, User } from 'lucide-react'
import type { CalendarMonth as CalendarMonthType } from '@/hooks/use-calendar'
import type { FriendParticipation } from '@/hooks/use-participations'

const monthEmojis = ['❄️', '💝', '🌱', '🌸', '🌹', '☀️', '🏖️', '🌙', '🍂', '🎃', '🍁', '🎄']

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

function formatDateRange(start: Date, end: Date): string {
  const dayStart = start.getDate()
  const dayEnd = end.getDate()
  const monthStart = start.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
  if (start.getTime() === end.getTime()) return `${dayStart} ${monthStart}`
  if (start.getMonth() === end.getMonth()) return `${dayStart}-${dayEnd} ${monthStart}`
  const monthEnd = end.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
  return `${dayStart} ${monthStart} - ${dayEnd} ${monthEnd}`
}

interface CalendarMonthProps {
  data: CalendarMonthType
  friendParticipations?: FriendParticipation[]
}

export function CalendarMonth({ data, friendParticipations = [] }: CalendarMonthProps) {
  const { month, year, label, events } = data
  const isEmpty = events.length === 0

  return (
    <div>
      {/* Month header */}
      <div className="calendar-month-header">
        <div className="calendar-month-name">
          {monthEmojis[month]} {label}
        </div>
        <div className="calendar-month-year">{year}</div>
      </div>

      {/* Event cards */}
      {!isEmpty && events.map(ev => {
        const hasImage = !!ev.imageUrl
        const colorClass = hasImage ? 'on-image' : 'no-image'

        // Find friends going to this event
        const friendsAtEvent = friendParticipations.filter(
          fp => fp.event_id === ev.id
        )

        return (
          <Link key={ev.id} to={`/evenement/${ev.id}`} className="calendar-event">
            {/* Background */}
            {hasImage ? (
              <img src={ev.imageUrl!} alt="" className="calendar-event-bg" />
            ) : (
              <div className="calendar-event-fallback">
                <Calendar strokeWidth={1} />
              </div>
            )}
            <div className={`calendar-event-gradient ${colorClass}`} />

            {/* Tag */}
            <span className={`calendar-event-tag ${colorClass}`}>{ev.primaryTag}</span>

            {/* Content */}
            <div className="calendar-event-content">
              <div className={`calendar-event-name ${colorClass}`}>{ev.name}</div>
              <div className={`calendar-event-meta ${colorClass}`}>
                <span>{formatDateRange(ev.startDate, ev.endDate)}</span>
                <span>·</span>
                <MapPin />
                <span>{ev.city}</span>
              </div>

              {/* Presence */}
              <div className={`calendar-event-presence ${colorClass}`}>
                <span className={`presence-badge me ${colorClass}`}>
                  <User style={{ width: 8, height: 8 }} />
                  J'y vais
                </span>
                {friendsAtEvent.length > 0 && (
                  <>
                    <div className="presence-avatars">
                      {friendsAtEvent.slice(0, 3).map((fp, i) => {
                        const name = fp.profiles?.display_name ?? '?'
                        const [from, to] = AVATAR_GRADIENTS[hashName(name) % AVATAR_GRADIENTS.length]
                        return (
                          <div
                            key={fp.id}
                            className="presence-avatar"
                            style={{ background: `linear-gradient(135deg, ${from}, ${to})`, zIndex: 3 - i }}
                          >
                            {name[0].toUpperCase()}
                          </div>
                        )
                      })}
                    </div>
                    <span>
                      {friendsAtEvent.length} ami{friendsAtEvent.length > 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
