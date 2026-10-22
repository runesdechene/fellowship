/**
 * QUOI     — la liste des dates suivantes, avec la ville et les amis présents.
 * POURQUOI — « X utilisateurs de Fellowship y vont » : on ne voit que son réseau. Sans date,
 *            trois lignes en squelettes montrent la place qu'elles prendront (maquette 2402:233).
 */
import { ArrowRight, Check, FolderInput } from 'lucide-react'
import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { SkeletonDot, SkeletonLine } from '@/components/ui/Skeleton'
import { formatDaysShort } from '@/lib/dates'
import { useTransitionNavigate } from '@/lib/navigation'
import type { DashboardDate } from './useDashboard'

/** Les lignes d'une liste vide : largeur du nom, puis de la ville. */
const SKETCH = [
  ['150px', '52px'],
  ['120px', '70px'],
  ['170px', '44px'],
] as const

export function UpcomingCard({ dates }: { dates: DashboardDate[] }) {
  const go = useTransitionNavigate()
  const empty = dates.length === 0

  return (
    <section className={empty ? 'upcoming skeleton-card' : 'upcoming'}>
      {empty ? (
        <ul className="upcoming__list" aria-hidden="true">
          {SKETCH.map(([name, place]) => (
            <li key={name} className="upcoming__row upcoming__row--skeleton">
              <SkeletonDot />
              <span className="upcoming__identity upcoming__identity--skeleton">
                <span className="upcoming__line">
                  <SkeletonLine width={name} tone="strong" />
                  <SkeletonLine width="34px" />
                </span>
                <SkeletonLine width={place} />
              </span>
            </li>
          ))}
        </ul>
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
                  <span
                    className="upcoming__status upcoming__status--confirmed"
                    role="img"
                    aria-label="Inscrit"
                  >
                    <Check size={14} strokeWidth={2.6} />
                  </span>
                ) : (
                  <span
                    className="upcoming__status upcoming__status--sent"
                    role="img"
                    aria-label="Dossier envoyé"
                  >
                    <FolderInput size={14} strokeWidth={2.2} />
                  </span>
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
        {empty ? 'Tes prochaines dates s’alignent ici' : 'Voir tout le calendrier'}
        <ArrowRight size={14} strokeWidth={2} />
      </button>
    </section>
  )
}
