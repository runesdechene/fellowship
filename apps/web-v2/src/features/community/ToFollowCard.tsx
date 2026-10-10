/**
 * QUOI     — « À suivre » : trois enseignes, chacune avec sa raison (« suivi par Tom et 2 autres »),
 *            et un + pour la suivre.
 * POURQUOI — lot 9a, maquette 2212:2 : agrandir son réseau tant que la communauté est jeune. Une
 *            enseigne suivie s'efface aussitôt ; la relecture la remplace par la suivante.
 */
import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { followReason } from '@/lib/community'
import type { ToFollow } from './useCommunity'

interface ToFollowCardProps {
  accounts: ToFollow[]
  followed: ReadonlySet<string>
  onFollow: (id: string) => void
}

export function ToFollowCard({ accounts, followed, onFollow }: ToFollowCardProps) {
  if (accounts.length === 0) return null
  return (
    <section className="side-card" aria-labelledby="to-follow-title">
      <h2 id="to-follow-title" className="side-card__title">
        À suivre
      </h2>
      <ul className="side-card__list">
        {accounts.map((account) => {
          const leaving = followed.has(account.id)
          const reason = followReason(account.reason)
          return (
            <li
              key={account.id}
              className={leaving ? 'side-card__row side-card__row--leaving' : 'side-card__row'}
              inert={leaving}
            >
              <Avatar className="side-card__avatar" src={account.avatarUrl} name={account.name} />
              <span className="side-card__body">
                {account.slug ? (
                  <Link className="side-card__name" to={`/${account.slug}`}>
                    {account.name}
                  </Link>
                ) : (
                  <span className="side-card__name">{account.name}</span>
                )}
                <span className="side-card__meta">
                  {account.city ? `${account.city} · ${reason}` : reason}
                </span>
              </span>
              <button
                type="button"
                className="side-card__follow"
                onClick={() => onFollow(account.id)}
                aria-label={`Suivre ${account.name}`}
              >
                <Plus size={13} strokeWidth={2} />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
