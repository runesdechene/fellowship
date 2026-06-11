import { Star } from 'lucide-react'
import { getTagEmoji, getTagLandingColor } from '@/components/ui/TagBadge'
import { eventBadge, participationChip, formatEventDateRange, type ActorKind } from '@/lib/explorer'
import type { PartLite } from './EventDeck'
import type { FriendAvatar } from '@/lib/map-data'
import type { EventWithScore } from '@/types/database'

interface EventGridCardProps {
  event: EventWithScore
  now: Date
  /** Label affiché du tag (résolu depuis la table tags ; fallback = slug). */
  tagLabel: string
  part?: PartLite
  actorKind: ActorKind
  friends: FriendAvatar[]
  saved: boolean
  onToggleSave: (event: EventWithScore) => void
  onClick: (event: EventWithScore) => void
}

export function EventGridCard({ event, now, tagLabel, part, actorKind, friends, saved, onToggleSave, onClick }: EventGridCardProps) {
  const tag = event.tags?.[0] ?? 'autre'
  const color = getTagLandingColor(tag)
  const badge = eventBadge(event, now)
  const chip = participationChip(part?.status, part?.payment_status, actorKind, { isPast: new Date(event.end_date) < now })
  const shown = friends.slice(0, 4)

  return (
    <div className="egrid-card" onClick={() => onClick(event)}>
      {chip && <span className={'card-status ' + chip.variant}>{chip.label}</span>}
      {badge && <span className={'card-badge ' + badge}>{badge === 'nouveau' ? '✨  Nouveau' : '🔥 Populaire'}</span>}

      {event.image_url
        ? <img className="egrid-img" src={event.image_url} alt={event.name} loading="lazy" />
        : <div className="egrid-img egrid-img--empty" aria-hidden="true">{getTagEmoji(tag)}</div>}
      <div className="egrid-scrim" aria-hidden="true" />

      <div className="egrid-ov">
        <span className="dock-tag" style={{ '--c': color } as React.CSSProperties}>
          <span aria-hidden="true">{getTagEmoji(tag)}</span>{tagLabel}
        </span>
        <div className="egrid-name">{event.name}</div>
        <div className="egrid-meta">
          <span aria-hidden="true">📅</span><b>{formatEventDateRange(event.start_date, event.end_date)}</b>
          <span aria-hidden="true">📍</span><b>{event.city}</b>
        </div>
        <div className="egrid-bottom">
          <div className="egrid-friends">
            {shown.length > 0 && (
              <span className="egrid-avs">
                {shown.map((f, i) => (
                  <span
                    key={i}
                    className="egrid-av"
                    style={f.avatarUrl ? { backgroundImage: `url(${JSON.stringify(f.avatarUrl)})` } : undefined}
                  >
                    {!f.avatarUrl && (f.label.trim()[0] ?? '?').toUpperCase()}
                  </span>
                ))}
              </span>
            )}
            {friends.length > 0 && (
              <span className="egrid-fcount">
                {friends.length === 1 ? `${friends[0].label} y va` : `${friends.length} compagnons y vont`}
              </span>
            )}
          </div>
          <button
            type="button"
            className={'egrid-star' + (saved ? ' on' : '')}
            aria-label={saved ? 'Ne plus repérer' : 'Repérer'}
            aria-pressed={saved}
            onClick={(e) => { e.stopPropagation(); onToggleSave(event) }}
          >
            <Star size={17} strokeWidth={2} fill={saved ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
    </div>
  )
}
