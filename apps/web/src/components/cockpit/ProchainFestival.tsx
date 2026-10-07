import { Link } from 'react-router-dom'
import { Compass, Route, FileText, MapPin, Lock } from 'lucide-react'
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

export function ProchainFestival({ participation }: Props) {
  const now = new Date()

  if (!participation) {
    return (
      <div className="glass-card ck-card ck-next-empty">
        <div className="da-eyebrow">PROCHAIN FESTIVAL</div>
        <p className="ck-empty-txt">Aucun festival confirmé à venir.</p>
        <div className="ck-next-actions" style={{ marginTop: '16px' }}>
          <Link to="/explorer" className="da-btn da-btn-flat"><Compass strokeWidth={2} /> Explorer les festivals</Link>
        </div>
      </div>
    )
  }

  const ev = participation.events
  const start = new Date(ev.start_date)
  const dleft = daysUntil(start, now)
  const chip = participationChip(participation.status, participation.payment_status, 'entity')

  const dateLabel = start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  const metaLabel = `${dateLabel.toUpperCase()} · ${ev.city.toUpperCase()}${ev.department ? `, ${ev.department}` : ''}`
  const mapsHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${ev.name}, ${ev.city}`)}`

  const statusLabel = chip?.label?.replace(/^[\W]+/, '').trim() ?? null
  const statusVariant = chip?.variant ?? null

  return (
    <div className="glass-card ck-card ck-next">
      <div className="ck-next-poster">
        {ev.image_url ? <img src={ev.image_url} alt={ev.name} /> : <div className="ck-next-noposter" />}
      </div>
      <div className="ck-next-body">
        <div className="da-eyebrow" style={{ marginBottom: 0 }}>PROCHAIN · DANS</div>
        <div className="ck-next-when">
          <span className="ck-jx-big">
            {dleft > 0
              ? <>{dleft}<small>jours</small></>
              : dleft === 0
                ? 'Jour J'
                : 'En cours'}
          </span>
        </div>
        <h2 className="ck-next-name">
          {ev.name}
          {ev.is_private && <Lock className="inline h-4 w-4 opacity-70 ml-1.5" strokeWidth={2.2} />}
        </h2>
        <p className="ck-next-meta"><MapPin strokeWidth={2} /> {metaLabel}</p>
        {statusVariant && statusLabel && (
          <span
            className="ck-status-hero"
            style={{ '--chip': `var(--status-${statusVariant})` } as React.CSSProperties}
          >
            <span className="ck-dot live" />
            {statusLabel}
          </span>
        )}
        <div className="ck-next-actions">
          <Link to={eventPath(ev)} className="da-btn da-btn-flat"><FileText strokeWidth={2} /> Voir la fiche</Link>
          <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="da-btn da-btn-ghost"><Route strokeWidth={2} /> Itinéraire</a>
        </div>
      </div>
    </div>
  )
}
