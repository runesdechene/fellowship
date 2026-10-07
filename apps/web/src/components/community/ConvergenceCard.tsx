import { Link } from 'react-router-dom'
import { avatarColor, type Convergence } from '@/lib/community'
import { eventPath } from '@/lib/event-link'
import { avatarImgStyle } from './ActorLinks'

function fmtRange(start: string, end: string): string {
  const s = new Date(start), e = new Date(end)
  const opt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return s.toDateString() === e.toDateString()
    ? s.toLocaleDateString('fr-FR', opt)
    : `${s.toLocaleDateString('fr-FR', { day: 'numeric' })}–${e.toLocaleDateString('fr-FR', opt)}`
}

export function ConvergenceCard({ conv }: { conv: Convergence }) {
  const { event, count, sample } = conv
  return (
    <div className="conv">
      {event.imageUrl && (
        <Link to={eventPath(event)} className="conv-affiche"><img src={event.imageUrl} alt="" /></Link>
      )}
      <div className="conv-body">
        <span className="conv-eyb">🎪 Ça se rassemble</span>
        <Link to={eventPath(event)} className="conv-title"><b>{event.name}</b></Link>
        <div className="conv-meta">{fmtRange(event.startDate, event.endDate)}{event.city ? ` · ${event.city}` : ''}</div>
        <div className="conv-foot">
          <div className="avs">
            {sample.map(a => (
              <span key={a.actorId} style={a.avatarUrl ? undefined : { background: avatarColor(a.label) }}>
                {a.avatarUrl ? <img src={a.avatarUrl} alt="" style={avatarImgStyle} /> : a.label[0]?.toUpperCase()}
              </span>
            ))}
            {count > sample.length && <span className="avs-more">+{count - sample.length}</span>}
          </div>
          <span className="ftxt"><b>{count} de tes compagnons</b> y seront</span>
        </div>
      </div>
      <Link className="btn btn-g" to={eventPath(event)}>Voir le festival</Link>
    </div>
  )
}
