import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { formatDaysShort } from '@/lib/dates'
import type { DashboardDate } from './useDashboard'

/** « Lyon, 3 amis » — la ville, puis les amis présents s'il y en a. */
function placeLine(date: DashboardDate): string {
  const friends = date.friends.length
  if (friends === 0) return date.event.city
  return `${date.event.city}, ${friends} ${friends === 1 ? 'ami' : 'amis'}`
}

export function UpcomingCard({ dates }: { dates: DashboardDate[] }) {
  return (
    <section className="upcoming">
      <h2 className="upcoming__title">À venir</h2>

      {dates.length === 0 ? (
        <p className="upcoming__empty">Aucune autre date programmée.</p>
      ) : (
        <ul className="upcoming__list">
          {dates.map((date) => (
            <li
              key={date.participationId}
              className={date.confirmed ? 'upcoming__row' : 'upcoming__row upcoming__row--pending'}
            >
              <span className="upcoming__dot" />
              <span className="upcoming__identity">
                <span className="upcoming__line">
                  <span className="upcoming__name">{date.event.name}</span>
                  <span className="upcoming__countdown">{formatDaysShort(date.daysAway)}</span>
                </span>
                <span className="upcoming__place">{placeLine(date)}</span>
              </span>
              {date.friends.length > 0 && (
                <AvatarStack>
                  {date.friends.map((friend) => (
                    <Avatar key={friend.id} src={friend.avatarUrl} name={friend.name} />
                  ))}
                </AvatarStack>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
