import { Link } from 'react-router-dom'
import { Wallet, CheckCircle2, Lock } from 'lucide-react'
import { eventPath } from '@/lib/event-link'
import { participationChip } from '@/lib/explorer'
import type { ParticipationWithEvent } from '@/types/database'

interface Props {
  participations: ParticipationWithEvent[]
}

export function AReglerFinaliser({ participations }: Props) {
  return (
    <div className="ck-card">
      <h3>
        <span className="ck-ic cop"><Wallet strokeWidth={1.8} /></span>
        À régler &amp; finaliser
      </h3>

      {participations.length === 0 ? (
        <p className="ck-empty-txt ck-allset"><CheckCircle2 strokeWidth={1.8} /> Tout est à jour</p>
      ) : (
        <ul className="ck-list">
          {participations.slice(0, 6).map(p => {
            const ev = p.events
            const chip = participationChip(p.status, p.payment_status, 'entity')
            return (
              <li key={p.id}>
                <Link to={eventPath(ev)} className="ck-list-row">
                  <span className="ck-list-info">
                    <b>{ev.name}{ev.is_private && <Lock className="inline h-3 w-3 opacity-70 ml-1" strokeWidth={2.2} />}</b>
                    <small>{ev.city} · {new Date(ev.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</small>
                  </span>
                  {chip && <span className={'ck-badge sm ' + chip.variant}>{chip.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
