import { useMemo, useState } from 'react'
import type { ParticipationWithEvent, LedgerEntry } from '@/types/database'
import { buildPastBilans, type PastBilan } from '@/lib/cockpit-bilans'
import { formatDateRangeWithYear } from '@/lib/calendar-format'
import { BilanModal } from '@/components/reports/BilanModal'

const MAX_ROWS = 5

interface Props {
  participations: ParticipationWithEvent[]
  entriesByEvent: Map<string, LedgerEntry[]>
  onSaved: () => void
  /** Horloge unique de la page (CockpitV2.tsx) : requis, pas de valeur par
   *  défaut — un `new Date()` local ici désynchroniserait ce bloc du reste
   *  de la page à minuit ou dans un onglet resté longtemps ouvert (#5). */
  now: Date
}

export function MesBilansV2({ participations, entriesByEvent, onSaved, now }: Props) {
  const bilans = useMemo(() => buildPastBilans(participations, entriesByEvent, now), [participations, entriesByEvent, now])
  const rows = useMemo(() => bilans.slice(0, MAX_ROWS), [bilans])
  const extra = bilans.length - rows.length

  const [openEventId, setOpenEventId] = useState<string | null>(null)

  if (bilans.length === 0) return null // pas de festival passé → module masqué

  // Total net = somme des bénéfices connus (repris de MesBilans.tsx : b.profit est null
  // tant que le bilan n'a aucune ligne, donc simplement ignoré dans la somme).
  const totalNet = bilans.reduce((s, b) => s + (b.profit ?? 0), 0)

  return (
    <>
    <div className="ck2-block">
      <div className="ck2-block-head">
        <h3 className="ck2-h3">Mes bilans</h3>
        {bilans.length > 0 && (
          <span className="app2-faint">{extra > 0 ? `${bilans.length} ›` : 'tous ›'}</span>
        )}
      </div>

      <div className="ck2-list">
        {rows.map((b: PastBilan) => {
          const ev = b.participation.events
          const hasEntries = b.entries.length > 0
          const net = b.profit
          return (
            <button
              key={b.participation.id}
              type="button"
              className="ck2-li"
              style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
              onClick={() => setOpenEventId(ev.id)}
            >
              <span className="ck2-txt">
                <span className="ck2-t">{ev.name}</span>
                {/* La date reste visible même sans bilan rempli (#8) : sinon deux
                    éditions du même festival, l'une remplie et l'autre pas,
                    deviennent littéralement la même ligne. L'année est incluse
                    car ce bloc liste des festivals passés sur plusieurs saisons. */}
                <span className="ck2-s">
                  {formatDateRangeWithYear(new Date(ev.start_date), new Date(ev.end_date))}
                  {!hasEntries && ' · Remplir le bilan'}
                </span>
              </span>
              {net != null && (
                <span className={`ck2-amount ${net > 0 ? 'ck2-pos' : net < 0 ? 'ck2-neg' : ''}`}>
                  {net > 0 ? '+' : ''}{net.toLocaleString('fr-FR')} €
                </span>
              )}
            </button>
          )
        })}
        <div className="ck2-li">
          <span className="ck2-txt">
            <span className="ck2-t">Total net</span>
          </span>
          <span className={`ck2-amount ${totalNet > 0 ? 'ck2-pos' : totalNet < 0 ? 'ck2-neg' : ''}`}>
            {totalNet > 0 ? '+' : ''}{totalNet.toLocaleString('fr-FR')} €
          </span>
        </div>
      </div>
    </div>

    {/* Modale HORS de la carte : .ck2-block piège les position:fixed si un backdrop-filter
        traîne quelque part → rendue en frère du bloc, comme la V1. */}
    {openEventId && (
      <BilanModal
        eventId={openEventId}
        onClose={() => setOpenEventId(null)}
        onSaved={() => { setOpenEventId(null); onSaved() }}
      />
    )}
    </>
  )
}
