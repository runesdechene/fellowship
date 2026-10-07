import type { ParticipationWithEvent, LedgerEntry } from '@/types/database'
import { ledgerProfit } from '@/lib/ledger'

export interface PastBilan {
  participation: ParticipationWithEvent
  entries: LedgerEntry[]
  profit: number | null     // null si aucune ligne
  revenueIn: number         // somme des entrants (pour affichage « CA / Reçu »)
}

/**
 * Festivals PASSÉS confirmés (inscrit, end_date < now), triés du plus récent au plus ancien,
 * chacun joint à ses lignes de registre + le bénéfice calculé.
 */
export function buildPastBilans(
  parts: ParticipationWithEvent[],
  entriesByEvent: Map<string, LedgerEntry[]>,
  now: Date,
): PastBilan[] {
  return parts
    .filter(p => p.events && p.status === 'inscrit' && new Date(p.events.end_date).getTime() < now.getTime())
    .sort((a, b) => new Date(b.events.end_date).getTime() - new Date(a.events.end_date).getTime())
    .map(p => {
      const entries = entriesByEvent.get(p.event_id) ?? []
      const revenueIn = entries.filter(e => e.direction === 'in').reduce((s, e) => s + e.amount, 0)
      return {
        participation: p,
        entries,
        profit: entries.length ? ledgerProfit(entries) : null,
        revenueIn,
      }
    })
}

/** Total des cachets reçus (orientation payé) vs emplacements payés (orientation payeur). */
export function splitOrientation(bilans: PastBilan[]): { recu: number; paye: number } {
  let recu = 0, paye = 0
  for (const b of bilans) {
    const orientation = (b.participation as { payment_orientation?: string }).payment_orientation ?? 'payeur'
    if (orientation === 'paye') recu += b.entries.filter(e => e.direction === 'in').reduce((s, e) => s + e.amount, 0)
    else paye += b.entries.filter(e => e.direction === 'out').reduce((s, e) => s + e.amount, 0)
  }
  return { recu, paye }
}
