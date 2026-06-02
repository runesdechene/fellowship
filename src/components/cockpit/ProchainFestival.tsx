import { Link } from 'react-router-dom'
import { Compass, Route, Share2, FileText, MapPin } from 'lucide-react'
import { participationChip } from '@/lib/explorer'
import type { ParticipationWithEvent } from '@/types/database'

interface Props {
  participation: ParticipationWithEvent | null
}

function daysUntil(start: Date, now: Date): number {
  const ms = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
    - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.round(ms / 86_400_000)
}

export function ProchainFestival({ participation }: Props) {
  const now = new Date()

  if (!participation) {
    return (
      <div className="ck-card ck-next-empty">
        <h3>Prochain festival</h3>
        <p className="ck-empty-txt">Aucun festival confirmé à venir.</p>
        <Link to="/explorer" className="ck-btn ck-btn-p"><Compass strokeWidth={2} /> Explorer les festivals</Link>
      </div>
    )
  }

  const ev = participation.events
  const start = new Date(ev.start_date)
  const dleft = daysUntil(start, now)
  const jLabel = dleft > 0 ? `J-${dleft}` : dleft === 0 ? 'Jour J' : 'En cours'
  const chip = participationChip(participation.status, participation.payment_status, 'entity')
  const dateLabel = start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  const mapsHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${ev.name}, ${ev.city}`)}`

  return (
    <div className="ck-card ck-next">
      <div className="ck-next-poster">
        {ev.image_url ? <img src={ev.image_url} alt={ev.name} /> : <div className="ck-next-noposter" />}
      </div>
      <div className="ck-next-body">
        <div className="ck-next-head">
          <span className="ck-next-eyebrow">Prochain festival</span>
          {chip && <span className={'ck-badge ' + chip.variant}>{chip.label}</span>}
        </div>
        <h2 className="ck-next-name">{ev.name}</h2>
        <div className="ck-next-when">
          <span className="ck-jx-big">{jLabel}</span>
          <span className="ck-next-date">{dateLabel}</span>
        </div>
        <p className="ck-next-meta"><MapPin strokeWidth={2} /> {ev.city} ({ev.department})</p>
        <div className="ck-next-actions">
          <Link to={`/evenement/${ev.id}`} className="ck-btn ck-btn-p"><FileText strokeWidth={2} /> Voir le dossier</Link>
          <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="ck-btn ck-btn-g"><Route strokeWidth={2} /> Itinéraire</a>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${ev.name} — ${window.location.origin}/evenement/${ev.id}`)}`}
            target="_blank" rel="noopener noreferrer" className="ck-btn ck-btn-g"
          ><Share2 strokeWidth={2} /> Partager</a>
        </div>
      </div>
    </div>
  )
}
