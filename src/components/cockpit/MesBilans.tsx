import { useMemo, useState } from 'react'
import { ClipboardList, Pencil, Plus } from 'lucide-react'
import type { ParticipationWithEvent, LedgerEntry } from '@/types/database'
import { buildPastBilans, splitOrientation, type PastBilan } from '@/lib/cockpit-bilans'
import { BilanModal } from '@/components/reports/BilanModal'

const MAX_ROWS = 5

interface Props {
  participations: ParticipationWithEvent[]
  entriesByEvent: Map<string, LedgerEntry[]>
  onSaved: () => void
}

export function MesBilans({ participations, entriesByEvent, onSaved }: Props) {
  const now = useMemo(() => new Date(), [])
  const bilans = useMemo(() => buildPastBilans(participations, entriesByEvent, now), [participations, entriesByEvent, now])
  const rows = useMemo(() => bilans.slice(0, MAX_ROWS), [bilans])

  const [openEventId, setOpenEventId] = useState<string | null>(null)

  if (bilans.length === 0) return null // pas de festival passé → module masqué

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const split = splitOrientation(bilans)

  return (
    <div className="ck-card">
      <h3><span className="ck-ic cop"><ClipboardList strokeWidth={1.8} /></span> Mes bilans</h3>

      {(split.recu > 0 || split.paye > 0) && (
        <div className="ck-bilan-split">
          {split.recu > 0 && <span>Cachets reçus : <b>{split.recu.toLocaleString('fr-FR')} €</b></span>}
          {split.paye > 0 && <span>Emplacements payés : <b>{split.paye.toLocaleString('fr-FR')} €</b></span>}
        </div>
      )}

      <ul className="ck-bilan-list">
        {rows.map((b: PastBilan) => {
          const ev = b.participation.events
          const hasEntries = b.entries.length > 0
          return (
            <li key={b.participation.id}>
              <button type="button" className={'ck-bilan-row' + (hasEntries ? '' : ' todo')} onClick={() => setOpenEventId(ev.id)}>
                {ev.image_url
                  ? <span className="ck-bilan-thumb"><img src={ev.image_url} alt="" /></span>
                  : <span className="ck-bilan-thumb ck-bilan-thumb-ph" />}
                <span className="ck-bilan-bd">
                  <b>{ev.name}</b>
                  <small>{fmtDate(ev.start_date)} · {ev.city}</small>
                  {hasEntries ? (
                    <span className="ck-bilan-stats">
                      <span className="ck-bilan-stat"><i>Recettes</i> {b.revenueIn.toLocaleString('fr-FR')} €</span>
                      <span className={'ck-bilan-stat ' + ((b.profit ?? 0) >= 0 ? 'pos' : 'neg')}><i>Bénéf.</i> {((b.profit ?? 0) >= 0 ? '+' : '') + (b.profit ?? 0).toLocaleString('fr-FR')} €</span>
                    </span>
                  ) : (
                    <span className="ck-bilan-fill"><Plus strokeWidth={2.2} /> Remplir le bilan</span>
                  )}
                </span>
                {hasEntries && <Pencil className="ck-bilan-edit" strokeWidth={2} />}
              </button>
            </li>
          )
        })}
      </ul>

      {openEventId && (
        <BilanModal
          eventId={openEventId}
          onClose={() => setOpenEventId(null)}
          onSaved={() => { setOpenEventId(null); onSaved() }}
        />
      )}
    </div>
  )
}
