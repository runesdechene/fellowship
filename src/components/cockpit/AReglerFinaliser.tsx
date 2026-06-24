import { Link } from 'react-router-dom'
import { CheckCircle2, Lock } from 'lucide-react'
import { eventPath } from '@/lib/event-link'
import { participationChip } from '@/lib/explorer'
import type { ParticipationWithEvent, LedgerEntry } from '@/types/database'

interface Props {
  participations: ParticipationWithEvent[]
  entriesByEvent: Map<string, LedgerEntry[]>
}

/** Maps payment/status variant → CSS status variable for the amount color */
function amountColor(variant: string): string {
  if (variant === 'apayer')  return 'var(--status-apayer)'
  if (variant === 'acompte') return 'var(--status-acompte)'
  return 'hsl(var(--muted-foreground))'
}

/** Montant à régler = ligne « emplacement » (out) saisie au stepper, si renseignée. */
function dueAmount(entries: LedgerEntry[] | undefined): number | null {
  if (!entries) return null
  const empl = entries.find(e => e.source === 'stepper' && e.direction === 'out')
  return empl && empl.amount > 0 ? empl.amount : null
}

export function AReglerFinaliser({ participations, entriesByEvent }: Props) {
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
            const due = dueAmount(entriesByEvent.get(ev.id))
            return (
              <li key={p.id}>
                <Link to={eventPath(ev)} className="ck-list-row">
                  <span className="ck-list-info">
                    <b>{ev.name}{ev.is_private && <Lock className="inline h-3 w-3 opacity-70 ml-1" strokeWidth={2.2} />}</b>
                    <small>{ev.city} · {new Date(ev.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</small>
                  </span>
                  {chip && (
                    <span className="ck-areg-right">
                      {due != null && (
                        <span className="ck-amt" style={{ color }}>{due.toLocaleString('fr-FR')} €</span>
                      )}
                      <span className="ck-areg-lbl">
                        <span className="ck-dot" style={{ '--chip': `var(--status-${chip.variant})` } as React.CSSProperties} />
                        {chip.label.replace(/^€\s*/, '')}
                      </span>
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
