import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { formatDaysShort } from '@/lib/dates'
import { useTransitionNavigate } from '@/lib/navigation'
import type { DashboardDate } from './useDashboard'

/** « Lyon, 3 amis » — la ville, puis les amis présents s'il y en a. */
function placeLine(date: DashboardDate): string {
  const friends = date.friends.length
  if (friends === 0) return date.event.city
  return `${date.event.city}, ${friends} ${friends === 1 ? 'ami' : 'amis'}`
}

export function UpcomingCard({ dates }: { dates: DashboardDate[] }) {
  const go = useTransitionNavigate()

  return (
    <section className="upcoming">
      {dates.length === 0 ? (
        <p className="upcoming__empty">Aucune autre date programmée.</p>
      ) : (
        <ul className="upcoming__list">
          {dates.map((date) => (
            /* Le `li` reste l'élément de liste ; c'est le bouton qu'il porte
               qui mène à la date et qui répond au survol. */
            <li key={date.participationId} className="upcoming__item">
              <button
                type="button"
                className={
                  date.confirmed ? 'upcoming__row' : 'upcoming__row upcoming__row--pending'
                }
                onClick={() => go(`/evenement/${date.event.id}`)}
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
              </button>
            </li>
          ))}
        </ul>
      )}
      <span className="upcoming__footer">Voir tout le calendrier &gt;</span>
    </section>
  )
}
