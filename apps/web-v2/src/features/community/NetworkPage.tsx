/**
 * QUOI     — « Mes amis » et « Mes abonnés » (/communaute/amis, /communaute/abonnes) : qui ils sont,
 *            leur vitrine, et pour une demande d'ami en attente, refuser ou suivre en retour.
 * POURQUOI — Uriel, 19/10/2026 : cliquer sur « 12 amis · 15 abonnés » doit montrer qui ils sont.
 *            Même en-tête et mêmes filtres que la page Communauté, la liste dans une carte.
 */
import { Plus, X } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { kindLabel, peopleCount, type Member } from '@/lib/network'
import { useDeclarePageChrome } from '@/lib/page-chrome'
import { useNetwork } from './useNetwork'

export function NetworkPage() {
  const friendsShown = useParams().liste !== 'abonnes'
  const { network, failed, answered, followBack, decline } = useNetwork()
  useDeclarePageChrome({ poster: null, lead: null, back: '/communaute' })

  const requests = new Set(network?.requests.map((request) => request.id))
  const members = (friendsShown ? network?.friends : network?.followers) ?? []

  return (
    <div className="community">
      <header className="community__header">
        <h1 className="community__title">{friendsShown ? 'Mes amis' : 'Mes abonnés'}</h1>
        <p className="community__lead">
          {friendsShown
            ? 'Ceux que tu suis et qui te suivent : chacun voit où l’autre va.'
            : 'Tous ceux qui suivent ta vitrine. Un exposant que tu suis en retour devient ton ami.'}
        </p>
        <nav className="community__tabs" aria-label="Ta communauté">
          <Link
            className={friendsShown ? 'community__tab community__tab--on' : 'community__tab'}
            to="/communaute/amis"
            replace
          >
            {peopleCount(network?.friends.length ?? 0, 'ami')}
          </Link>
          <Link
            className={friendsShown ? 'community__tab' : 'community__tab community__tab--on'}
            to="/communaute/abonnes"
            replace
          >
            {peopleCount(network?.followers.length ?? 0, 'abonné')}
          </Link>
        </nav>
      </header>

      {failed ? (
        <p className="community__note">Ta communauté n’a pas pu être chargée.</p>
      ) : !network ? null : members.length === 0 ? (
        <p className="community__note">
          {friendsShown
            ? 'Pas encore d’ami : suis en retour les exposants qui te suivent.'
            : 'Personne ne suit encore ta vitrine.'}
        </p>
      ) : (
        <ul className="side-card network-list">
          {members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              waiting={requests.has(member.id)}
              leaving={answered.has(member.id)}
              onFollow={followBack}
              onDecline={decline}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

interface MemberRowProps {
  member: Member
  /** Une demande d'ami en attente : refuser ou suivre en retour. */
  waiting: boolean
  /** Une réponse vient d'être donnée : les boutons s'effacent avant la relecture. */
  leaving: boolean
  onFollow: (id: string) => void
  onDecline: (id: string) => void
}

function MemberRow({ member, waiting, leaving, onFollow, onDecline }: MemberRowProps) {
  return (
    <li className="side-card__row">
      <Avatar className="side-card__avatar" src={member.avatarUrl} name={member.name} />
      <span className="side-card__body">
        {member.slug ? (
          <Link className="side-card__name" to={`/${member.slug}`}>
            {member.name}
          </Link>
        ) : (
          <span className="side-card__name">{member.name}</span>
        )}
        <span className="side-card__meta">
          {waiting ? `${kindLabel(member.kind)} · te suit` : kindLabel(member.kind)}
        </span>
      </span>
      {waiting && (
        <span
          className={
            leaving
              ? 'network-list__actions network-list__actions--leaving'
              : 'network-list__actions'
          }
          inert={leaving}
        >
          <button
            type="button"
            className="side-card__follow"
            onClick={() => onDecline(member.id)}
            aria-label={`Refuser la demande de ${member.name}`}
          >
            <X size={13} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="side-card__follow"
            onClick={() => onFollow(member.id)}
            aria-label={`Suivre ${member.name} en retour`}
          >
            <Plus size={13} strokeWidth={2} />
          </button>
        </span>
      )}
    </li>
  )
}
