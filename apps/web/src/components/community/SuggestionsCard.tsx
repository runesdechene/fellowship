import { type Suggestion } from '@/lib/community'
import { ActorAvatar, ActorName } from './ActorLinks'

export function SuggestionsCard({ items, isFollowed, onFollow }: {
  items: Suggestion[]
  isFollowed: (actorId: string) => boolean
  onFollow: (actorId: string) => void
}) {
  if (items.length === 0) return null
  return (
    <div className="card">
      <h2>Suggestions pour toi</h2>
      {items.map(s => {
        const on = isFollowed(s.actor.actorId)
        return (
          <div key={s.actor.actorId} className="sugg">
            <ActorAvatar actor={s.actor} className="sav" />
            <div className="sb"><ActorName actor={s.actor} /><span>{s.reason}</span></div>
            <button className={`btn btn-g btn-follow ${on ? 'is-on' : ''}`} onClick={() => !on && onFollow(s.actor.actorId)} disabled={on}>
              <span>{on ? 'Suivi' : 'Suivre'}</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
