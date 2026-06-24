import { EventGridCard } from './EventGridCard'
import type { ActorKind, PartLite } from '@/lib/explorer'
import type { FriendAvatar } from '@/lib/map-data'
import type { EventWithScore } from '@/types/database'

interface EventGridProps {
  events: EventWithScore[]
  now: Date
  partByEvent: Map<string, PartLite>
  actorKind: ActorKind
  friendsByEvent: Record<string, FriendAvatar[]>
  isSaved: (eventId: string) => boolean
  onToggleSave: (event: EventWithScore) => void
  onCardClick: (event: EventWithScore) => void
}

export function EventGrid({ events, now, partByEvent, actorKind, friendsByEvent, isSaved, onToggleSave, onCardClick }: EventGridProps) {
  return (
    <div className="egrid-wrap">
      <div className="egrid">
        {events.map(ev => (
          <EventGridCard
            key={ev.id}
            event={ev}
            now={now}
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
