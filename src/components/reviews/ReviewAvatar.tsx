import { Link } from 'react-router-dom'
import { avatarColor } from '@/lib/community'

interface Props {
  label: string | null
  avatarUrl: string | null
  slug: string | null
  className: string
}

/** Avatar exposant pour un avis : photo s'il y en a une, sinon pastille initiale
 *  colorée déterministe (même palette que ActorAvatar). Cliquable vers la
 *  vitrine si l'acteur a un slug. */
export function ReviewAvatar({ label, avatarUrl, slug, className }: Props) {
  const safeLabel = label ?? '?'
  const initial = safeLabel[0]?.toUpperCase() ?? '?'
  const hasImg = !!avatarUrl
  const style = hasImg ? undefined : { background: avatarColor(safeLabel) }
  const content = hasImg
    ? <img src={avatarUrl!} alt={safeLabel} />
    : <span>{initial}</span>

  if (slug) {
    return (
      <Link
        to={`/${slug}`}
        className={`${className} review-avatar-clickable`}
        style={style}
        aria-label={safeLabel}
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </Link>
    )
  }
  return <div className={className} style={style}>{content}</div>
}
