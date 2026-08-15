import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { eventPath } from '@/lib/event-link'
import { participationChip } from '@/lib/explorer'
import type { ParticipationWithEvent, LedgerEntry } from '@/types/database'

interface Props {
  participations: ParticipationWithEvent[]
  entriesByEvent: Map<string, LedgerEntry[]>
}

/** Montant à régler = LA ligne « emplacement » (stepper + out) si elle est renseignée.
 *  Jamais une somme : les autres lignes du grand livre sont des recettes et des frais.
 *  `amount` est en EUROS. Repris tel quel de AReglerFinaliser.tsx. */
function dueAmount(entries: LedgerEntry[] | undefined): number | null {
  if (!entries) return null
  const empl = entries.find(e => e.source === 'stepper' && e.direction === 'out')
  return empl && empl.amount > 0 ? empl.amount : null
}

export function AReglerV2({ participations, entriesByEvent }: Props) {
  const visible = participations.slice(0, 5)
  const extra = participations.length - visible.length

  return (
    <div className="ck2-block">
      <div className="ck2-block-head">
        <h3 className="ck2-h3">À régler</h3>
        {participations.length > 0 && (
          <Link to="/calendrier" className="app2-faint">{extra > 0 ? `${participations.length} ›` : 'tout ›'}</Link>
        )}
      </div>

      {participations.length === 0 ? (
        <p className="app2-muted ck2-allset"><CheckCircle2 strokeWidth={1.8} /> Tout est à jour</p>
      ) : (
        <div className="ck2-list">
          {visible.map(p => {
            const ev = p.events
            const chip = participationChip(p.status, p.payment_status, 'entity')
            const due = dueAmount(entriesByEvent.get(ev.id))
            // Repris tel quel de AReglerFinaliser.tsx : le label du chip débarrassé du
            // « € » qui le préfixe parfois. Toutes les lignes de ce bloc sont en attente
            // par construction (cf. selectAReglerItems) : la bille reste ambre partout,
            // c'est ce label qui porte la nuance de statut.
            const label = chip?.label.replace(/^€\s*/, '')
            return (
              <Link key={p.id} to={eventPath(ev)} className="ck2-li">
                <span className="ck2-dot ck2-wait" aria-hidden="true" />
                <span className="ck2-txt">
                  <span className="ck2-t">{ev.name}</span>
                  <span className="ck2-s">
                    {ev.city} · {new Date(ev.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    {label && ` · ${label}`}
                  </span>
                </span>
                {due != null && <span className="ck2-amount">{due.toLocaleString('fr-FR')} €</span>}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
