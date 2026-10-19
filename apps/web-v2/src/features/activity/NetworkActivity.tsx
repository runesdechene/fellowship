/**
 * QUOI     — le fil « Activité du réseau » en bas de la barre latérale : quatre nouvelles du
 *            réseau, la plus récente en haut, avec leur âge.
 * POURQUOI — voir le réseau bouger donne envie de revenir ; c'est le seul vert de l'interface,
 *            le point « en direct ». « Tout voir » mène à la page Communauté.
 */
import { ArrowRight } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/lib/auth'
import { timeAgo } from '@/lib/dates'
import { useTransitionNavigate } from '@/lib/navigation'
import { Link } from 'react-router-dom'
import { useNetworkActivity } from './useNetworkActivity'

/** Un nom cité : un lien quand il mène quelque part, du texte sinon. */
function Mention({
  name,
  to,
  strong = false,
}: {
  name: string
  to: string | null
  strong?: boolean
}) {
  const className = strong ? 'network-activity__name' : undefined
  return to ? (
    <Link className={className} to={to}>
      {name}
    </Link>
  ) : (
    <span className={className}>{name}</span>
  )
}

export function NetworkActivity() {
  const { actor } = useAuth()
  const { items, error } = useNetworkActivity(actor?.id)
  const go = useTransitionNavigate()

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
          {items.map((item) => {
            const { actor, text } = item
            const face = (
              <Avatar className="network-activity__face" src={actor.avatarUrl} name={actor.name} />
            )
            return (
              <li key={item.id} className="network-activity__item">
                {/* Le visage double le nom : un seul arrêt au clavier, celui du nom. */}
                {actor.slug ? (
                  <Link to={`/${actor.slug}`} tabIndex={-1} aria-hidden="true">
                    {face}
                  </Link>
                ) : (
                  face
                )}
                <span className="network-activity__text">
                  <Mention name={actor.name} to={actor.slug && `/${actor.slug}`} strong />{' '}
                  {text.verb}
                  {text.object && (
                    <>
                      {' '}
                      <Mention name={text.object.name} to={text.object.to} />
                    </>
                  )}
                </span>
                <span className="network-activity__time">{timeAgo(item.occurredAt, now)}</span>
              </li>
            )
          })}
        </ul>
      )}
      <button type="button" className="network-activity__more" onClick={() => go('/communaute')}>
        Tout voir
        <ArrowRight size={12} strokeWidth={2} />
      </button>
    </section>
  )
}
