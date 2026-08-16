import { Link } from 'react-router-dom'
import { participationChip } from '@/lib/explorer'
import { eventPath } from '@/lib/event-link'
import type { ParticipationWithEvent } from '@/types/database'

interface Props {
  participations: ParticipationWithEvent[]
  /** Horloge unique de la page (CockpitV2.tsx) : requis, pas de valeur par
   *  défaut — un `new Date()` local ici désynchroniserait le J-N de « À
   *  venir » du reste de la page à minuit ou dans un onglet longtemps
   *  ouvert (#5), et se réévaluait ici à chaque rendu (non mémoïsé). */
  now: Date
}

const STRIP_CAP = 4

/** Reprise de chipToStatusVar (ProchainsFestivals.tsx V1), remappée sur les jetons du
 *  calque : les statuts confirmés (inscrit/going) prennent --ok, tout le reste (en
 *  attente : repéré, dossier, accepté, à payer, acompte) prend --wait. */
function chipToStatusVar(variant: string): 'ok' | 'wait' {
  const CONFIRMED = new Set(['inscrit', 'going'])
  return CONFIRMED.has(variant) ? 'ok' : 'wait'
}

/** Reprise de ProchainsFestivals.tsx (V1) : même cap, même sélection, remise en
 *  liste sobre dans un .ck2-block. La trame texturée de la V1 n'est pas reportée (0007). */
export function AVenirV2({ participations, now }: Props) {
  if (participations.length === 0) return null

  const visible = participations.slice(0, STRIP_CAP)
  const extra = participations.length - visible.length

  return (
    <div className="ck2-block">
      <h3 className="ck2-h3">À venir</h3>
      <div className="ck2-list">
        {visible.map(p => {
          const ev = p.events
          const chip = participationChip(p.status, p.payment_status, 'entity')
          const statusVar = chip ? chipToStatusVar(chip.variant) : 'wait'
          const start = new Date(ev.start_date)
          const jMinus = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          return (
            <Link key={p.id} to={eventPath(ev)} className="ck2-li">
              <span className={`ck2-dot ck2-${statusVar}`} aria-hidden="true" />
              <span className="ck2-txt">
                <span className="ck2-t">{ev.name}</span>
                <span className="ck2-s">{ev.city}</span>
              </span>
              <span className="ck2-s">J-{jMinus}</span>
            </Link>
          )
        })}
      </div>
      {extra > 0 && <Link to="/calendrier" className="app2-faint">+{extra} autres ›</Link>}
    </div>
  )
}
