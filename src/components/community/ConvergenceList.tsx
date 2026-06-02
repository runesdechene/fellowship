import { Link } from 'react-router-dom'
import { avatarColor, type Convergence } from '@/lib/community'
import { eventPath } from '@/lib/event-link'
import { avatarImgStyle } from './ActorLinks'

export function ConvergenceList({ items }: { items: Convergence[] }) {
  if (items.length === 0) return null
  return (
    <div className="card">
      <h2>Convergences à venir</h2>
      {items.map(c => (
        <Link key={c.event.id} to={eventPath(c.event)} className="conv-mini">
          <div className="cm-b">
            <b>{c.event.name}</b>
            <span>{new Date(c.event.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}{c.event.city ? ` · ${c.event.city}` : ''}</span>
          </div>
          <div className="avs">
            {c.sample.slice(0, 2).map(a => (
              <span key={a.actorId} style={a.avatarUrl ? undefined : { background: avatarColor(a.label) }}>
                {a.avatarUrl ? <img src={a.avatarUrl} alt="" style={avatarImgStyle} /> : a.label[0]?.toUpperCase()}
              </span>
            ))}
            {c.count > 2 && <span className="avs-more">+{c.count - 2}</span>}
          </div>
        </Link>
      ))}
    </div>
  )
}
