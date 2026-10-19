/**
 * QUOI     — « Ta communauté » : amis et abonnés, ce qu'est un ami, et les demandes d'ami en
 *            attente : une croix pour refuser, un + pour suivre en retour.
 * POURQUOI — Uriel, 19/10/2026 : il faut que les exposants aient envie de se connecter entre eux.
 *            Une demande, c'est un compte qui te suit sans que tu le suives : le suivre en retour
 *            en fait un ami ; la refuser la retire, l'abonné reste abonné. Une demande répondue
 *            s'efface aussitôt, la relecture du réseau fait le reste.
 */
import { Plus, X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { networkCounts, requestsLabel } from '@/lib/community'
import type { Network } from '@/lib/friends'

/** Trois demandes à la fois, comme les autres encadrés ; suivre fait monter les suivantes. */
const SHOWN = 3

interface NetworkCardProps {
  network: Network
  /** Les demandes suivies en retour ou refusées : elles s'effacent avant la relecture. */
  answered: ReadonlySet<string>
  onFollow: (id: string) => void
  onDecline: (id: string) => void
}

export function NetworkCard({ network, answered, onFollow, onDecline }: NetworkCardProps) {
  const { friends, followers, requests } = network
  return (
    <section className="side-card" aria-labelledby="network-title">
      <h2 id="network-title" className="side-card__title">
        Ta communauté
      </h2>
      <div className="network-card__intro">
        <p className="network-card__counts">{networkCounts(friends, followers)}</p>
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
