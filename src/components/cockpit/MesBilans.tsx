import { useMemo, useState } from 'react'
import { Pencil, Plus, Lock } from 'lucide-react'
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
  const extra = bilans.length - rows.length

  const [openEventId, setOpenEventId] = useState<string | null>(null)

  if (bilans.length === 0) return null // pas de festival passé → module masqué

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const split = splitOrientation(bilans)

  return (
    <div className="ck-card">
      <div className="ck-eyebrow">
        MES BILANS
        {bilans.length > 0 && (
          <span className="ck-seeall" style={{ cursor: 'default' }}>
            {extra > 0 ? `${bilans.length} ›` : 'tous ›'}
          </span>
        )}
      </div>

      {(split.recu > 0 || split.paye > 0) && (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}>
          {split.recu > 0 && <span>Cachets : <b style={{ color: 'var(--status-inscrit)' }}>{split.recu.toLocaleString('fr-FR')} €</b></span>}
          {split.paye > 0 && <span>Emplt. payés : <b style={{ color: 'hsl(var(--foreground))' }}>{split.paye.toLocaleString('fr-FR')} €</b></span>}
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
                  <b>{ev.name}{ev.is_private && <Lock className="inline h-3 w-3 opacity-70 ml-1" strokeWidth={2.2} />}</b>
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
