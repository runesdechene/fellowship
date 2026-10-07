/**
 * QUOI     — la liste des dates suivantes, avec la ville et les amis présents.
 * POURQUOI — « X utilisateurs de Fellowship y vont » : on ne voit que son réseau.
 */
import { ArrowRight, Contrast } from 'lucide-react'
import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { formatDaysShort } from '@/lib/dates'
import { useTransitionNavigate } from '@/lib/navigation'
import type { DashboardDate } from './useDashboard'

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
                className="upcoming__row"
                onClick={() => go(`/evenement/${date.event.id}`)}
              >
                {date.confirmed ? (
                  <span className="upcoming__dot" />
                ) : (
                  <Contrast className="upcoming__pending" size={12} strokeWidth={2.4} />
                )}
                <span className="upcoming__identity">
                  <span className="upcoming__line">
                    <span className="upcoming__name">{date.event.name}</span>
                    <span className="upcoming__countdown">{formatDaysShort(date.daysAway)}</span>
                  </span>
                  <span className="upcoming__place">{date.event.city}</span>
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
      <button
        type="button"
        className="upcoming__footer"
        onClick={() => {
          go('/calendrier')
        }}
      >
        Voir tout le calendrier
        <ArrowRight size={14} strokeWidth={2} />
      </button>
    </section>
  )
}
