import { Star, Calendar, MapPin } from 'lucide-react'
import { getTagEmoji, getTagLandingColor } from '@/components/ui/TagBadge'
import { eventBadge, participationChip, participationDot, formatEventDateRange, type ActorKind, type PartLite } from '@/lib/explorer'
import type { FriendAvatar } from '@/lib/map-data'
import type { EventWithScore } from '@/types/database'

interface EventGridCardProps {
  event: EventWithScore
  now: Date
  part?: PartLite
  actorKind: ActorKind
  friends: FriendAvatar[]
  saved: boolean
  onToggleSave: (event: EventWithScore) => void
  onClick: (event: EventWithScore) => void
  canAddImage: boolean
  onAddImage: (event: EventWithScore) => void
}

export function EventGridCard({ event, now, part, actorKind, friends, saved, onToggleSave, onClick, canAddImage, onAddImage }: EventGridCardProps) {
  const tag = event.tags?.[0] ?? 'autre'
  const badge = eventBadge(event, now)
  const isPast = new Date(event.end_date) < now
  const chip = participationChip(part?.status, part?.payment_status, actorKind, { isPast })
  // « Repéré » est déjà signalé par l'étoile pleine → le pied n'affiche le point de statut
  // que pour les autres états (Inscrit, Dossier, À payer…).
  const showStatus = !!chip && chip.variant !== 'repere'
  const dot = showStatus ? participationDot(part?.status, part?.payment_status, actorKind, { isPast }) : null
  // Pas de participation → carte atténuée (désat. + transp.) pour faire ressortir les dates engagées.
  const muted = !part
  const shown = friends.slice(0, 4)
  const friendsLabel = friends.length === 1 ? `${friends[0].label} y va` : `${friends.length} compagnons y vont`

  return (
    <div className={'egrid-card grain' + (muted ? ' egrid-card--muted' : '')} onClick={() => onClick(event)}>
      <div className="egrid-img">
        {event.image_url
          ? <img className="egrid-imgel" src={event.image_url} alt={event.name} loading="lazy" />
          : (
            <div className="egrid-img--empty" aria-hidden="true" style={{ '--c': getTagLandingColor(tag) } as React.CSSProperties}>
              <span className="egrid-img-emoji">{getTagEmoji(tag)}</span>
            </div>
          )}
        {!event.image_url && canAddImage && (
          <button
            type="button"
            className="egrid-addimg"
            onClick={(e) => { e.stopPropagation(); onAddImage(event) }}
          >
            + Ajouter une affiche
          </button>
        )}
        <div className="egrid-imgfade" aria-hidden="true" />
        {badge && (
          <span className={'egrid-badge ' + badge}>
            <span className="egrid-badge-dot" aria-hidden="true" />
            {badge === 'nouveau' ? 'Nouveau' : 'Populaire'}
          </span>
        )}
      </div>

      <div className="egrid-body">
        <div className="egrid-titlerow">
          <div className="egrid-name">{event.name}</div>
          <button
            type="button"
            className={'egrid-star' + (saved ? ' on' : '')}
            aria-label={saved ? 'Ne plus repérer' : 'Repérer'}
            aria-pressed={saved}
            onClick={(e) => { e.stopPropagation(); onToggleSave(event) }}
          >
            <Star size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="egrid-meta">
          <span className="egrid-meta-item"><Calendar size={12} /><b>{formatEventDateRange(event.start_date, event.end_date)}</b></span>
          <span className="egrid-meta-item"><MapPin size={12} /><b>{event.city}</b></span>
        </div>

        <div className="egrid-foot">
          {dot ? (
            <span className="egrid-status">
              <span className="da-dot" style={{ '--dot-color': dot.colorVar } as React.CSSProperties} />
              {dot.label}
            </span>
          ) : friends.length > 0 ? (
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
              <span className="egrid-fcount">{friendsLabel}</span>
            </div>
          ) : (
            <span className="egrid-foot-empty">À découvrir</span>
          )}
        </div>
      </div>
    </div>
  )
}
