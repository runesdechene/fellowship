import { useFriendsOnEvent } from '@/hooks/use-participations'
import { getTagEmoji, getTagLandingColor } from '@/components/ui/TagBadge'
import { ActorAvatar, ActorName } from '@/components/community/ActorLinks'
import type { FeedActor } from '@/lib/community'
import type { EventWithScore } from '@/types/database'
import { formatEventDateRange } from '@/lib/explorer'

interface EventDockProps {
  event: EventWithScore
  tagInfo?: { label?: string; bg?: string; color?: string }
  /** Rejoue le fade doux à chaque changement d'événement. Off pendant le scrub (évite le strobe). */
  animate?: boolean
}

export function EventDock({ event, tagInfo, animate = true }: EventDockProps) {
  const { friends } = useFriendsOnEvent(event.id)
  const tag = event.tags?.[0] ?? 'autre'
  // Acteurs (mapping vers FeedActor) : avatar photo OU pastille colorée, nom cliquable vers la vitrine.
  const actors: FeedActor[] = friends.map(f => ({
    actorId: f.actor_id,
    label: f.label ?? 'Un compagnon',
    avatarUrl: f.avatar_url,
    slug: f.public_slug,
  }))
  return (
    <div key={animate ? event.id : 'static'} className={'dockinfo' + (animate ? ' eh-fade' : '')}>
      {/* Tag — même recette graphique que les .etag de la landing (pilule teintée de --c) */}
      <span className="dock-tag" style={{ '--c': getTagLandingColor(tag) } as React.CSSProperties}>
        <span aria-hidden="true">{getTagEmoji(tag)}</span>
        {tagInfo?.label ?? tag}
      </span>

      <h2>{event.name}</h2>

      <div className="eh-meta">
        <div className="eh-item">
          <span className="eh-ico" aria-hidden="true">📅</span>
          <div className="eh-lines">
            <div className="eh-strong">{formatEventDateRange(event.start_date, event.end_date)}</div>
            <div className="eh-sub">{new Date(event.start_date).getFullYear()}</div>
          </div>
        </div>
        <span className="eh-div" aria-hidden="true" />
        <div className="eh-item">
          <span className="eh-ico" aria-hidden="true">📍</span>
          <div className="eh-lines">
            <div className="eh-strong">{event.city}</div>
            {event.department && <div className="eh-sub">Dept. {event.department}</div>}
          </div>
        </div>
      </div>

      {actors.length > 0 && (
        <div className="fr">
          <span className="cav">
            {actors.slice(0, 4).map(a => (
              <ActorAvatar key={a.actorId} actor={a} className="cav-av" />
            ))}
          </span>
          {actors.length === 1
            ? <span><ActorName actor={actors[0]} /> y va</span>
            : `${actors.length} compagnons y vont`}
        </div>
      )}
    </div>
  )
}
