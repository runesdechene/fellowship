/**
 * QUOI     — « Ta communauté » : amis et abonnés (deux liens vers leurs listes), ce qu'est un ami, et les demandes d'ami en
 *            attente : une croix pour refuser, un + pour suivre en retour.
 * POURQUOI — Uriel, 19/10/2026 : il faut que les exposants aient envie de se connecter entre eux ;
 *            un mur de visages montre qu'il y a du monde, mieux qu'un nombre seul.
 *            Une demande, c'est un compte qui te suit sans que tu le suives : le suivre en retour
 *            en fait un ami ; la refuser la retire, l'abonné reste abonné. Une demande répondue
 *            s'efface aussitôt, la relecture du réseau fait le reste.
 */
import { Plus, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { peopleCount, requestsLabel, wallOf, type Network } from '@/lib/network'

/** Trois demandes à la fois, comme les autres encadrés ; suivre fait monter les suivantes. */
const SHOWN = 3

/** Deux rangées de six : assez de visages pour montrer qu'il y a du monde. */
const WALL = 12

interface NetworkCardProps {
  network: Network
  /** Les demandes suivies en retour ou refusées : elles s'effacent avant la relecture. */
  answered: ReadonlySet<string>
  onFollow: (id: string) => void
  onDecline: (id: string) => void
}

export function NetworkCard({ network, answered, onFollow, onDecline }: NetworkCardProps) {
  const { friends, followers, requests } = network
  const wall = wallOf(network, WALL)
  return (
    <section className="side-card" aria-labelledby="network-title">
      <h2 id="network-title" className="side-card__title">
        Ta communauté
      </h2>
      <div className="network-card__intro">
        <p className="network-card__counts">
          <Link className="network-card__count" to="/communaute/amis">
            {peopleCount(friends.length, 'ami')}
          </Link>
          {' · '}
          <Link className="network-card__count" to="/communaute/abonnes">
            {peopleCount(followers.length, 'abonné')}
          </Link>
        </p>
        {wall.faces.length > 0 && (
          <Link
            className="network-card__wall"
            to="/communaute/abonnes"
            aria-label={`Voir tes ${peopleCount(followers.length, 'abonné')}`}
          >
            {wall.faces.map((member) => (
              <Avatar
                key={member.id}
                className="network-card__tile"
                src={member.avatarUrl}
                name={member.name}
              />
            ))}
            {wall.more > 0 && (
              <span className="network-card__tile network-card__more">+{wall.more}</span>
            )}
          </Link>
        )}
        <p className="side-card__meta">
          Un ami, c’est un exposant que tu suis et qui te suit : chacun voit où l’autre va.
        </p>
      </div>
      {requests.length > 0 && (
        <>
          <h3 className="network-card__requests">{requestsLabel(requests.length)}</h3>
          <ul className="side-card__list">
            {requests.slice(0, SHOWN).map((request) => {
              const leaving = answered.has(request.id)
              return (
                <li
                  key={request.id}
                  className={leaving ? 'side-card__row side-card__row--leaving' : 'side-card__row'}
                  inert={leaving}
                >
                  <Avatar
                    className="side-card__avatar"
                    src={request.avatarUrl}
                    name={request.name}
                  />
                  <span className="side-card__body">
                    <span className="side-card__name">{request.name}</span>
                    <span className="side-card__meta">te suit</span>
                  </span>
                  <button
                    type="button"
                    className="side-card__follow"
                    onClick={() => onDecline(request.id)}
                    aria-label={`Refuser la demande de ${request.name}`}
                  >
                    <X size={13} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    className="side-card__follow"
                    onClick={() => onFollow(request.id)}
                    aria-label={`Suivre ${request.name} en retour`}
                  >
                    <Plus size={13} strokeWidth={2} />
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
