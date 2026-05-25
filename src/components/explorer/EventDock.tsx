import { Link } from 'react-router-dom'
import { useFriendsOnEvent } from '@/hooks/use-participations'
import { getTagEmoji, getTagLandingColor } from '@/components/ui/TagBadge'
import type { EventWithScore } from '@/types/database'

const STATUS_PILL: Record<string, { label: string; cls: string }> = {
  interesse: { label: '★ Repéré', cls: 'eh-status repere' },
  inscrit: { label: '✓ Tu y vas', cls: 'eh-status going' },
  confirme: { label: '✓ Tu y vas', cls: 'eh-status going' },
  en_cours: { label: '✓ Tu y vas', cls: 'eh-status going' },
}

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
  saved: boolean
  status: string | null
  onToggleSave: () => void
  tagInfo?: { label?: string; bg?: string; color?: string }
}

export function EventDock({ event, saved, status, onToggleSave, tagInfo }: EventDockProps) {
  const { friends } = useFriendsOnEvent(event.id)
  const tag = event.tags?.[0] ?? 'autre'
  const pill = status ? STATUS_PILL[status] : null
  return (
    <div className="dockinfo">
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

      {pill && <span className={pill.cls}>{pill.label}</span>}

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

      <div className="cta">
        <Link to={`/evenement/${event.id}`} className="btn btn-ghost">Voir le festival</Link>
        <button type="button" className="btn btn-star" onClick={onToggleSave} aria-pressed={saved}>
          {saved ? '★ Repéré' : '★ Repérer'}
        </button>
      </div>
    </div>
  )
}
