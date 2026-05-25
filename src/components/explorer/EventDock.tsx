import { useFriendsOnEvent } from '@/hooks/use-participations'
import { getTagEmoji, getTagLandingColor } from '@/components/ui/TagBadge'
import type { StatusChip } from '@/lib/explorer'
import type { EventWithScore } from '@/types/database'

function dateRange(start: string, end: string): string {
  const s = new Date(start), e = new Date(end)
  const day = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric' })
  const month = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'long' })
  if (start === end) return `${day(s)} ${month(s)}`
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) return `${day(s)}–${day(e)} ${month(s)}`
  const sm = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
  return `${day(s)} ${sm(s)} – ${day(e)} ${sm(e)}`
}

interface EventDockProps {
  event: EventWithScore
  statusChip: StatusChip | null
  tagInfo?: { label?: string; bg?: string; color?: string }
  /** Rejoue le fade doux à chaque changement d'événement. Off pendant le scrub (évite le strobe). */
  animate?: boolean
}

export function EventDock({ event, statusChip, tagInfo, animate = true }: EventDockProps) {
  const { friends } = useFriendsOnEvent(event.id)
  const tag = event.tags?.[0] ?? 'autre'
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
            <div className="eh-strong">{dateRange(event.start_date, event.end_date)}</div>
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

      {statusChip && <span className={'eh-status ' + statusChip.variant}>{statusChip.label}</span>}

      {friends.length > 0 && (
        <div className="fr">
          <span className="cav">
            {friends.slice(0, 4).map(f => (
              <span key={f.actor_id} title={f.label ?? ''}>{(f.label ?? '?').slice(0, 1).toUpperCase()}</span>
            ))}
          </span>
          {friends.length === 1 ? `${friends[0].label ?? 'Un compagnon'} y va` : `${friends.length} compagnons y vont`}
        </div>
      )}
    </div>
  )
}
