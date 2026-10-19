/**
 * QUOI     — « Tu connais peut-être » (« À suivre » jusqu'au 19/10/2026) : trois enseignes,
 *            chacune avec sa raison (« suivi par Tom et 2 autres »), et un + pour la suivre.
 * POURQUOI — lot 9a, maquette 2212:2 ; sur téléphone, une rangée de cartes (maquette 2363:25), avec
 *            les amis en commun et « Suivre » écrit. Lot 9a : agrandir son réseau tant que la communauté est jeune. Une
 *            enseigne suivie s'efface aussitôt ; la relecture la remplace par la suivante.
 */
import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { followReason, mutualLabel } from '@/lib/community'
import type { ToFollow } from './useCommunity'

interface ToFollowCardProps {
  accounts: ToFollow[]
  followed: ReadonlySet<string>
  onFollow: (id: string) => void
}

export function ToFollowCard({ accounts, followed, onFollow }: ToFollowCardProps) {
  if (accounts.length === 0) return null
  return (
    <section className="side-card side-card--to-follow" aria-labelledby="to-follow-title">
      <h2 id="to-follow-title" className="side-card__title">
        Tu connais peut-être
      </h2>
      <ul className="side-card__list">
        {accounts.map((account) => {
          const leaving = followed.has(account.id)
          const { total, faces } = account.mutual
          // Des amis en commun : ils remplacent la raison, qui dit moins.
          const meta = [account.city, total > 0 ? null : followReason(account.reason)]
            .filter(Boolean)
            .join(' · ')
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
                <span className="side-card__meta">{meta}</span>
                {total > 0 && (
                  <span className="side-card__mutual">
                    <AvatarStack>
                      {faces.map((face) => (
                        <Avatar
                          key={face.id}
                          className="side-card__face"
                          src={face.avatarUrl}
                          name={face.name}
                        />
                      ))}
                    </AvatarStack>
                    {mutualLabel(total)}
                  </span>
                )}
              </span>
              <button
                type="button"
                className="side-card__follow"
                onClick={() => onFollow(account.id)}
                aria-label={`Suivre ${account.name}`}
              >
                <Plus size={13} strokeWidth={2} />
                <span className="side-card__follow-label">Suivre</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
