import { Link } from 'react-router-dom'
import { CheckCircle2, Lock } from 'lucide-react'
import { eventPath } from '@/lib/event-link'
import { participationChip } from '@/lib/explorer'
import type { ParticipationWithEvent } from '@/types/database'

interface Props {
  participations: ParticipationWithEvent[]
}

/** Maps payment/status variant → CSS status variable for the amount color */
function amountColor(variant: string): string {
  if (variant === 'apayer')  return 'var(--status-apayer)'
  if (variant === 'acompte') return 'var(--status-acompte)'
  return 'hsl(var(--muted-foreground))'
}

export function AReglerFinaliser({ participations }: Props) {
  const visible = participations.slice(0, 3)
  const extra = participations.length - visible.length

  return (
    <div className="ck-card">
      <div className="ck-eyebrow">
        À RÉGLER &amp; FINALISER
        {participations.length > 0 && (
          <Link to="/calendrier" className="ck-seeall">
            {extra > 0 ? `${participations.length} ›` : 'tout ›'}
          </Link>
        )}
      </div>

      {participations.length === 0 ? (
        <p className="ck-empty-txt ck-allset"><CheckCircle2 strokeWidth={1.8} /> Tout est à jour</p>
      ) : (
        <ul className="ck-list">
          {visible.map(p => {
            const ev = p.events
            const chip = participationChip(p.status, p.payment_status, 'entity')
            const color = chip ? amountColor(chip.variant) : 'hsl(var(--muted-foreground))'
            return (
              <li key={p.id}>
                <Link to={eventPath(ev)} className="ck-list-row">
                  <span className="ck-list-info">
                    <b>{ev.name}{ev.is_private && <Lock className="inline h-3 w-3 opacity-70 ml-1" strokeWidth={2.2} />}</b>
                    <small>{ev.city} · {new Date(ev.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</small>
                  </span>
                  {chip && (
                    <span className="ck-badge sm">
                      <span className="ck-dot" style={{ '--chip': `var(--status-${chip.variant})` } as React.CSSProperties} />
                      <span className="ck-amt" style={{ color }}>{chip.label}</span>
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
