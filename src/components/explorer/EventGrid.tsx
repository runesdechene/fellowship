import { EventGridCard } from './EventGridCard'
import type { PartLite } from './EventDeck'
import type { ActorKind } from '@/lib/explorer'
import type { FriendAvatar } from '@/lib/map-data'
import type { EventWithScore } from '@/types/database'

interface EventGridProps {
  events: EventWithScore[]
  now: Date
  partByEvent: Map<string, PartLite>
  actorKind: ActorKind
  friendsByEvent: Record<string, FriendAvatar[]>
  /** Résout le label affiché d'un slug de tag. */
  tagLabel: (slug: string) => string
  isSaved: (eventId: string) => boolean
  onToggleSave: (event: EventWithScore) => void
  onCardClick: (event: EventWithScore) => void
}

export function EventGrid({ events, now, partByEvent, actorKind, friendsByEvent, tagLabel, isSaved, onToggleSave, onCardClick }: EventGridProps) {
  return (
    <div className="egrid-wrap">
      <div className="egrid-count">
        {events.length} festival{events.length !== 1 ? 's' : ''} trouvé{events.length !== 1 ? 's' : ''}
      </div>
      <div className="egrid">
        {events.map(ev => (
          <EventGridCard
            key={ev.id}
            event={ev}
            now={now}
            tagLabel={tagLabel(ev.tags?.[0] ?? 'autre')}
            part={partByEvent.get(ev.id)}
            actorKind={actorKind}
            friends={friendsByEvent[ev.id] ?? []}
            saved={isSaved(ev.id)}
            onToggleSave={onToggleSave}
            onClick={onCardClick}
          />
        ))}
      </div>
    </div>
  )
}
