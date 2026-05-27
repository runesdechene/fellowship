import { avatarColor, type Suggestion } from '@/lib/community'

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
            <div className="sav" style={{ background: avatarColor(s.actor.label) }}>{s.actor.label[0]?.toUpperCase()}</div>
            <div className="sb"><b>{s.actor.label}</b><span>{s.reason}</span></div>
            <button className={`btn btn-g btn-follow ${on ? 'is-on' : ''}`} onClick={() => onFollow(s.actor.actorId)}>
              <span>{on ? 'Suivi' : 'Suivre'}</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
