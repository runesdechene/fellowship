import { Link } from 'react-router-dom'
import { useFriendsOnEvent } from '@/hooks/use-participations'
import { getTagIcon } from '@/components/ui/TagBadge'
import type { EventWithScore } from '@/types/database'

function fmt(ev: EventWithScore) {
  const d = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const range = ev.end_date !== ev.start_date ? `${d(ev.start_date)} – ${d(ev.end_date)}` : d(ev.start_date)
  return `${range} · ${ev.city}${ev.department ? ` (${ev.department})` : ''}`
}

interface EventDockProps {
  event: EventWithScore
  eyebrow: string
  saved: boolean
  onToggleSave: () => void
}

export function EventDock({ event, eyebrow, saved, onToggleSave }: EventDockProps) {
  const { friends } = useFriendsOnEvent(event.id)
  const tag = event.tags?.[0] ?? 'autre'
  const Icon = getTagIcon(tag)
  return (
    <div className="dockinfo">
      {eyebrow && <span className="eyb">{eyebrow}</span>}
      <h2>{event.name}</h2>
      <div className="tagline">
        {/* eslint-disable-next-line react-hooks/static-components -- Icon is from TAG_ICONS static lookup, ref is stable */}
        <span className="ctag"><Icon size={12} strokeWidth={2} /> {tag}</span>
        <span className="meta">{fmt(event)}</span>
      </div>
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
        <Link to={`/evenement/${event.id}`} className="btn btn-p">Voir le festival</Link>
        <button type="button" className="btn btn-star" onClick={onToggleSave} aria-pressed={saved}>
          {saved ? '★ Repéré' : '★ Repérer'}
        </button>
      </div>
    </div>
  )
}
