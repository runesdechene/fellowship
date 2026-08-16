import { Chip, type ChipTone } from '@/components/ui/Chip'
import { formatDayMonthShort } from '@/lib/dates'
import { formatEuros } from '@/lib/money'
import type { Settlement, SettlementState } from './useDashboard'

/** Ce que chaque état raconte, et avec quelle pastille. */
const STATE: Record<SettlementState, { label: string; tone: ChipTone }> = {
  dossier: { label: 'Dossier envoyé', tone: 'neutral' },
  acompte: { label: 'Acompte versé', tone: 'ok' },
  'a-payer': { label: 'À payer', tone: 'pending' },
}

export function SettlementsSection({ settlements }: { settlements: Settlement[] }) {
  return (
    <div className="settlements">
      {settlements.map((item) => {
        const state = STATE[item.state]
        return (
          <button key={item.participationId} type="button" className="settlement">
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
