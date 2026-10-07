/**
 * QUOI     — le fil « Activité du réseau » en bas de la barre latérale : quatre nouvelles du
 *            réseau, la plus récente en haut, avec leur âge.
 * POURQUOI — voir le réseau bouger donne envie de revenir ; c'est le seul vert de l'interface,
 *            le point « en direct ».
 * ATTENTION — pas de « Tout voir » tant que l'écran Communauté (lot 9) n'existe pas.
 */
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/lib/auth'
import { timeAgo } from '@/lib/dates'
import { useNetworkActivity } from './useNetworkActivity'

export function NetworkActivity() {
  const { actor } = useAuth()
  const { items, error } = useNetworkActivity(actor?.id)

  if (!error && items.length === 0) return null
  const now = new Date()

  return (
    <section className="network-activity" aria-label="Activité du réseau">
      <h2 className="network-activity__title">
        <span className="network-activity__live" aria-hidden="true" />
        Activité du réseau
      </h2>
      {error ? (
        <p className="network-activity__text">Le fil n’a pas pu être chargé.</p>
      ) : (
        <ul className="network-activity__list">
          {items.map((item) => (
            <li key={item.id} className="network-activity__item">
              <Avatar
                className="network-activity__face"
                src={item.actor.avatarUrl}
                name={item.actor.name}
              />
              <span className="network-activity__text">
                <b>{item.actor.name}</b> {item.text}
              </span>
              <span className="network-activity__time">{timeAgo(item.occurredAt, now)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
