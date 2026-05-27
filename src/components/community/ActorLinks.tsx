import { type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { avatarColor, type FeedActor } from '@/lib/community'

/** Style d'une vraie photo d'avatar : remplit la pastille ronde/carrée du parent. */
// eslint-disable-next-line react-refresh/only-export-components
export const avatarImgStyle: CSSProperties = {
  width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit', display: 'block',
}

/** Avatar : la photo si l'acteur en a une, sinon une pastille initiale colorée.
 *  Cliquable vers la vitrine si l'acteur a un slug. */
export function ActorAvatar({ actor, className }: { actor: FeedActor; className: string }) {
  const initial = actor.label[0]?.toUpperCase() ?? '?'
  const hasImg = !!actor.avatarUrl
  const content = hasImg
    ? <img src={actor.avatarUrl!} alt={actor.label} style={avatarImgStyle} />
    : initial
  const style = hasImg ? undefined : { background: avatarColor(actor.label) }
  if (actor.slug) {
    return (
      <Link to={`/${actor.slug}`} className={`${className} actor-clickable`} style={style} aria-label={actor.label}>
        {content}
      </Link>
    )
  }
  return <div className={className} style={style}>{content}</div>
}

/** Nom de l'acteur en gras. Lien vers la vitrine si slug, sinon texte simple. */
export function ActorName({ actor }: { actor: FeedActor }) {
  if (actor.slug) return <Link to={`/${actor.slug}`} className="actor-name">{actor.label}</Link>
  return <b>{actor.label}</b>
}
