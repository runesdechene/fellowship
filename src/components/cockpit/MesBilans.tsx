import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, Pencil, Plus } from 'lucide-react'
import type { ParticipationWithEvent, EventReport } from '@/types/database'
import { buildPastBilans, type PastBilan } from '@/lib/cockpit-bilans'
import { signedUrlsFor } from '@/lib/bilan-media'
import { BilanModal } from '@/components/reports/BilanModal'

const MAX_ROWS = 5

interface Props {
  participations: ParticipationWithEvent[]
  reportsByEvent: Map<string, EventReport>
  onSaved: () => void
}

export function MesBilans({ participations, reportsByEvent, onSaved }: Props) {
  const now = useMemo(() => new Date(), [])
  const bilans = useMemo(() => buildPastBilans(participations, reportsByEvent, now), [participations, reportsByEvent, now])
  const rows = useMemo(() => bilans.slice(0, MAX_ROWS), [bilans])

  const [openEventId, setOpenEventId] = useState<string | null>(null)
  const [thumbs, setThumbs] = useState<Map<string, string>>(new Map())

  // Signer la 1re photo de chaque bilan pour la bande d'aperçu (bucket privé).
  useEffect(() => {
    const firstPaths = rows.map(b => b.report?.media_paths?.[0]).filter((p): p is string => !!p)
    if (firstPaths.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThumbs(new Map()); return
    }
    let cancelled = false
    signedUrlsFor(firstPaths).then(m => { if (!cancelled) setThumbs(m) })
    return () => { cancelled = true }
  }, [rows])

  if (bilans.length === 0) return null // pas de festival passé → module masqué

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

  return (
    <div className="ck-card">
      <h3><span className="ck-ic cop"><ClipboardList strokeWidth={1.8} /></span> Mes bilans</h3>

      <ul className="ck-bilan-list">
        {rows.map((b: PastBilan) => {
          const ev = b.participation.events
          const hasReport = !!b.report
          const note = b.report?.note
          const firstPhoto = b.report?.media_paths?.[0]
          return (
            <li key={b.participation.id}>
              <button type="button" className={'ck-bilan-row' + (hasReport ? '' : ' todo')} onClick={() => setOpenEventId(ev.id)}>
                {firstPhoto && thumbs.get(firstPhoto)
                  ? <span className="ck-bilan-thumb"><img src={thumbs.get(firstPhoto)} alt="" /></span>
                  : ev.image_url
                    ? <span className="ck-bilan-thumb"><img src={ev.image_url} alt="" /></span>
                    : <span className="ck-bilan-thumb ck-bilan-thumb-ph" />}
                <span className="ck-bilan-bd">
                  <b>{ev.name}</b>
                  <small>{fmtDate(ev.start_date)} · {ev.city}</small>
                  {hasReport ? (
                    <span className="ck-bilan-stats">
                      <span className="ck-bilan-stat"><i>CA</i> {(b.report!.revenue ?? 0).toLocaleString('fr-FR')} €</span>
                      <span className={'ck-bilan-stat ' + ((b.profit ?? 0) >= 0 ? 'pos' : 'neg')}><i>Bénéf.</i> {(b.profit! >= 0 ? '+' : '') + b.profit!.toLocaleString('fr-FR')} €</span>
                    </span>
                  ) : (
                    <span className="ck-bilan-fill"><Plus strokeWidth={2.2} /> Remplir le bilan</span>
                  )}
                  {hasReport && note && <span className="ck-bilan-note">« {note} »</span>}
                </span>
                {hasReport && <Pencil className="ck-bilan-edit" strokeWidth={2} />}
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
