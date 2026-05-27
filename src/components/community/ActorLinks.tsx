import { Link } from 'react-router-dom'
import { avatarColor, type FeedActor } from '@/lib/community'

/** Avatar (pastille initiale colorée). Cliquable vers la vitrine si l'acteur a un slug. */
export function ActorAvatar({ actor, className }: { actor: FeedActor; className: string }) {
  const initial = actor.label[0]?.toUpperCase() ?? '?'
  const style = { background: avatarColor(actor.label) }
  if (actor.slug) {
    return (
      <Link to={`/${actor.slug}`} className={`${className} actor-clickable`} style={style} aria-label={actor.label}>
        {initial}
      </Link>
    )
  }
  return <div className={className} style={style}>{initial}</div>
}

/** Nom de l'acteur en gras. Lien vers la vitrine si slug, sinon texte simple. */
export function ActorName({ actor }: { actor: FeedActor }) {
  if (actor.slug) return <Link to={`/${actor.slug}`} className="actor-name">{actor.label}</Link>
  return <b>{actor.label}</b>
}
