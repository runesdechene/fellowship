/**
 * QUOI     — une ligne du fil de la communauté : qui, la phrase, la petite carte du festival ou
 *            l'avis, l'âge, et le geste qui a un sens : Suivre, Souhaiter la bienvenue, Écrire.
 * POURQUOI — lot 9a, maquette 2212:2. Un avis sans auteur porte le bouclier de l'identité
 *            protégée : la base n'a pas donné le nom, l'écran ne le devine pas.
 *            Le fil engage la conversation (maquette 2815:233) : « Écrire » à un ami qui s'intéresse,
 *            va ou a candidaté, le festival joint ; une arrivée reçoit la bienvenue, pas un message
 *            (les messages restent entre amis, Uriel, 10/11/2026).
 */
import { HandHeart, MessageCircle, Plus, Shield } from 'lucide-react'
import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { OfficialBadge } from '@/components/ui/OfficialBadge'
import { EventChip } from '@/components/ui/EventChip'
import { Stars } from '@/components/ui/Stars'
import { feedPhrase, type FeedLine, type FeedPerson } from '@/lib/community'
import { timeAgo } from '@/lib/dates'
import { eventPath } from '@/lib/event-path'
import { useWrite } from '@/features/discussions/useWrite'

/** Les lignes d'un ami où « Écrire » engage la conversation sur le festival. */
const WRITABLE = ['going', 'applied', 'interested']

interface FeedItemProps {
  line: FeedLine
  now: Date
  /** Le compte que Suivre ajouterait, s'il y en a un à proposer. */
  followable: FeedPerson | null
  /** `welcome` : l'abonnement se dit « bienvenue » au nouveau venu. */
  onFollow: (id: string, welcome: boolean) => void
  /** L'auteur de la ligne est un ami : on peut lui écrire. */
  friend: boolean
  /** Arrivée depuis la dernière visite : le fond des notifications non lues. */
  fresh: boolean
}

function Review({ line }: { line: FeedLine }) {
  return (
    <Link className="feed-review" to={eventPath(line.event?.id ?? '')}>
      {line.stars !== null && <Stars score={line.stars} />}
      {line.comment && <span className="feed-review__comment">« {line.comment} »</span>}
      {!line.who && (
        <span className="feed-review__protected">
          <Shield size={12} strokeWidth={1.75} />
          Identité protégée — seuls ses amis exposants voient son nom
        </span>
      )}
    </Link>
  )
}

export function FeedItem({ line, now, followable, onFollow, friend, fresh }: FeedItemProps) {
  const phrase = feedPhrase(line)
  const { write, busy } = useWrite()
  const writeTo = friend && WRITABLE.includes(line.kind) ? line.who : null
  const welcome = line.kind === 'arrival'
  return (
    <li className={fresh ? 'feed-item feed-item--new' : 'feed-item'}>
      {line.who ? (
        <Avatar className="feed-item__avatar" src={line.who.avatarUrl} name={line.who.name} />
      ) : (
        <span className="feed-item__shield">
          <Shield size={18} strokeWidth={1.75} />
        </span>
      )}
      <div className="feed-item__body">
        <p className="feed-item__text">
          {phrase.map((part, index) =>
            typeof part === 'string' ? (
              part
            ) : index === 0 && line.who?.slug ? (
              <Fragment key={index}>
                <Link className="feed-item__name" to={`/${line.who.slug}`}>
                  {part.strong}
                </Link>
                <OfficialBadge actorId={line.who.id} />
              </Fragment>
            ) : (
              <b key={index}>{part.strong}</b>
            ),
          )}
        </p>
        {line.event && ['going', 'applied', 'interested', 'added'].includes(line.kind) && (
          <EventChip event={line.event} />
        )}
        {line.kind === 'review' && <Review line={line} />}
      </div>
      {/* L'âge flotte en haut à droite, Suivre dessous : la ligne gagne une hauteur de texte. */}
      <div className="feed-item__aside">
        <span className="feed-item__time">{timeAgo(line.at, now)}</span>
        {followable && (
          <button
            type="button"
            className="feed-item__follow"
            onClick={() => onFollow(followable.id, welcome)}
            aria-label={
              welcome ? `Souhaiter la bienvenue à ${followable.name}` : `Suivre ${followable.name}`
            }
          >
            {welcome ? <HandHeart size={13} strokeWidth={2} /> : <Plus size={13} strokeWidth={2} />}
            {welcome ? 'Souhaiter la bienvenue' : 'Suivre'}
          </button>
        )}
        {writeTo && (
          <button
            type="button"
            className="feed-item__follow"
            disabled={busy}
            onClick={() => void write(writeTo.id, line.event?.id)}
            aria-label={`Écrire à ${writeTo.name}`}
          >
            <MessageCircle size={13} strokeWidth={2} />
            Écrire
          </button>
        )}
      </div>
    </li>
  )
}
