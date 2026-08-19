import { Chip, type ChipTone } from '@/components/ui/Chip'
import { formatDayMonthShort } from '@/lib/dates'
import { formatEuros } from '@/lib/money'
import { useTransitionNavigate } from '@/lib/navigation'
import type { Settlement, SettlementState } from './useDashboard'

/**
 * Ce que chaque état raconte, et avec quelle pastille.
 *
 * Les teintes suivent le registre de l’app et non l’avancement : ce qui
 * compte n’est pas « où j’en suis » mais « qui doit bouger ».
 *   dossier — le dossier est parti, ça attend chez l’organisateur : TERRE
 *   acompte — l’acompte est versé, il reste le solde à payer : BLÉ
 *   à payer — rien n’est versé, tout reste à faire : BLÉ
 *
 * « Acompte versé » portait l’olive, donc l’ACQUIS, alors qu’il reste de
 * l’argent à sortir. C’est tout ce que le bloc « À régler » sert à dire.
 */
const STATE: Record<SettlementState, { label: string; tone: ChipTone }> = {
  dossier: { label: 'Dossier envoyé', tone: 'pending' },
  acompte: { label: 'Acompte versé', tone: 'todo' },
  'a-payer': { label: 'À payer', tone: 'todo' },
}

export function SettlementsSection({ settlements }: { settlements: Settlement[] }) {
  const go = useTransitionNavigate()

  return (
    <div className="settlements">
      {settlements.map((item) => {
        const state = STATE[item.state]
        return (
          <button
            key={item.participationId}
            type="button"
            className="settlement"
            onClick={() => go(`/evenement/${item.eventId}`)}
          >
            <span className="settlement__dot" />
            <span className="settlement__identity">
              <span className="settlement__name">{item.name}</span>
              <span className="settlement__place">
                {item.city} · {formatDayMonthShort(item.startDate)}
              </span>
            </span>
            <span className="settlement__state">
              {item.due !== null && <span className="settlement__due">{formatEuros(item.due)}</span>}
              <Chip tone={state.tone}>{state.label}</Chip>
            </span>
          </button>
        )
      })}
    </div>
  )
}
