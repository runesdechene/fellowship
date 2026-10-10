/**
 * QUOI     — une ligne du fil de la communauté : qui, la phrase, la petite carte du festival ou
 *            l'avis, l'âge, et Suivre quand il a un sens.
 * POURQUOI — lot 9a, maquette 2212:2. Un avis sans auteur porte le bouclier de l'identité
 *            protégée : la base n'a pas donné le nom, l'écran ne le devine pas.
 */
import { Plus, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Stars } from '@/components/ui/Stars'
import { feedPhrase, type FeedLine, type FeedPerson } from '@/lib/community'
import { formatDateRange, parseSqlDate, timeAgo } from '@/lib/dates'

interface FeedItemProps {
  line: FeedLine
  now: Date
  /** Le compte que Suivre ajouterait, s'il y en a un à proposer. */
  followable: FeedPerson | null
  onFollow: (id: string) => void
}

function EventCard({ line }: { line: FeedLine }) {
  if (!line.event) return null
  const { event } = line
  const dates = formatDateRange(parseSqlDate(event.startDate), parseSqlDate(event.endDate))
  const place = event.city
    ? ` · ${event.city}${event.department ? ` (${event.department})` : ''}`
    : ''
  return (
    <Link className="feed-event" to={`/evenement/${event.id}`}>
      {event.imageUrl ? (
        <img className="feed-event__poster" src={event.imageUrl} alt="" />
      ) : (
        <span className="feed-event__poster" />
      )}
      <span className="feed-event__body">
        <span className="feed-event__name">{event.name}</span>
        <span className="feed-event__meta">
          {dates}
          {place}
        </span>
      </span>
    </Link>
  )
}

function Review({ line }: { line: FeedLine }) {
  return (
    <Link className="feed-review" to={`/evenement/${line.event?.id ?? ''}`}>
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

export function FeedItem({ line, now, followable, onFollow }: FeedItemProps) {
  const phrase = feedPhrase(line)
  return (
    <li className="feed-item">
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
              <Link key={index} className="feed-item__name" to={`/${line.who.slug}`}>
                {part.strong}
              </Link>
            ) : (
              <b key={index}>{part.strong}</b>
            ),
          )}
        </p>
        {(line.kind === 'going' || line.kind === 'added') && <EventCard line={line} />}
        {line.kind === 'review' && <Review line={line} />}
      </div>
      {/* L'âge flotte en haut à droite, Suivre dessous : la ligne gagne une hauteur de texte. */}
      <div className="feed-item__aside">
        <span className="feed-item__time">{timeAgo(line.at, now)}</span>
        {followable && (
          <button
            type="button"
            className="feed-item__follow"
            onClick={() => onFollow(followable.id)}
            aria-label={`Suivre ${followable.name}`}
          >
            <Plus size={13} strokeWidth={2} />
            Suivre
          </button>
        )}
      </div>
    </li>
  )
}
