import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { participationChip } from '@/lib/explorer'
import { eventPath } from '@/lib/event-link'
import type { ParticipationWithEvent } from '@/types/database'

interface Props {
  participation: ParticipationWithEvent | null
}

function daysUntil(start: Date, now: Date): number {
  const ms = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
    - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.round(ms / 86_400_000)
}

export function ProchainFestivalV2({ participation }: Props) {
  const now = new Date()

  if (!participation) {
    return (
      <div className="ck2-block ck2-next-empty">
        <span className="app2-label">Prochain festival</span>
        <p className="app2-muted">Aucun festival confirmé à venir.</p>
        <Link to="/explorer" className="ck2-btn"><Compass strokeWidth={2} /> Explorer les festivals</Link>
      </div>
    )
  }

  const ev = participation.events
  const start = new Date(ev.start_date)
  const dleft = daysUntil(start, now)
  const chip = participationChip(participation.status, participation.payment_status, 'entity')
  const dateLabel = start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  const when = dleft > 0 ? `Dans ${dleft} jour${dleft > 1 ? 's' : ''}` : dleft === 0 ? 'Jour J' : 'En cours'

  return (
    <Link to={eventPath(ev)} className="ck2-block ck2-next">
      {/* Seul objet de la page à porter un rayon et une ombre : c'est une image. */}
      <div className="ck2-poster">
        {ev.image_url
          ? <img src={ev.image_url} alt={ev.name} />
          : <div className="ck2-poster-fallback" aria-hidden="true" />}
      </div>
      <div className="ck2-next-in">
        <span className="app2-label">Prochain festival</span>
        <span className="ck2-next-name">{ev.name}</span>
        <span className="app2-muted">
          {dateLabel} · {ev.city}{ev.department ? `, ${ev.department}` : ''}
        </span>
        <span className="ck2-badge">{when}</span>
        {chip?.label && <span className="app2-faint">{chip.label.replace(/^[\W]+/, '').trim()}</span>}
      </div>
    </Link>
  )
}
