import { Link } from 'react-router-dom'
import { CalendarClock, Plus, Lock } from 'lucide-react'
import { eventPath } from '@/lib/event-link'
import { participationChip } from '@/lib/explorer'
import type { ParticipationWithEvent } from '@/types/database'

interface Props {
  participations: ParticipationWithEvent[]
}

export function ProchainsFestivals({ participations }: Props) {
  return (
    <div className="ck-card">
      <h3>
        <span className="ck-ic cop"><CalendarClock strokeWidth={1.8} /></span>
        Tes prochains festivals
        <Link to="/calendrier" className="ck-seeall">Tout voir</Link>
      </h3>

      {participations.length === 0 ? (
        <p className="ck-empty-txt">Ajoute ta première date.</p>
      ) : (
        <ul className="ck-list">
          {participations.slice(0, 6).map(p => {
            const ev = p.events
            const d = new Date(ev.start_date)
            const chip = participationChip(p.status, p.payment_status, 'entity')
            return (
              <li key={p.id}>
                <Link to={eventPath(ev)} className="ck-list-row">
                  {ev.image_url
                    ? <span className="ck-list-thumb"><img src={ev.image_url} alt="" /></span>
                    : <span className="ck-list-thumb ck-list-thumb-ph" />}
                  <span className="ck-list-info">
                    <b>{ev.name}{ev.is_private && <Lock className="inline h-3 w-3 opacity-70 ml-1" strokeWidth={2.2} />}</b>
                    <small>{d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · {ev.city}</small>
                  </span>
                  {chip && <span className={'ck-badge sm ' + chip.variant}>{chip.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <Link to="/explorer" className="ck-addrow"><Plus strokeWidth={2.2} /> Ajouter une date</Link>
    </div>
  )
}
