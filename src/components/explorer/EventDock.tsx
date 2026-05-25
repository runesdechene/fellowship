import { Link } from 'react-router-dom'
import { useFriendsOnEvent } from '@/hooks/use-participations'
import { TagBadge } from '@/components/ui/TagBadge'
import type { EventWithScore } from '@/types/database'

interface EventDockProps {
  event: EventWithScore
  eyebrow: string
  saved: boolean
  onToggleSave: () => void
  tagInfo?: { label?: string; bg?: string; color?: string }
}

export function EventDock({ event, eyebrow, saved, onToggleSave, tagInfo }: EventDockProps) {
  const { friends } = useFriendsOnEvent(event.id)
  const tag = event.tags?.[0] ?? 'autre'
  return (
    <div className="dockinfo">
      {eyebrow && <span className="eyb">{eyebrow}</span>}
      <TagBadge slug={tag} label={tagInfo?.label ?? tag} bg={tagInfo?.bg} color={tagInfo?.color} size="md" />
      <h2>{event.name}</h2>
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
