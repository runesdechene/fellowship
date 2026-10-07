export type LedgerDirection = 'in' | 'out'
export type LedgerCategory =
  | 'emplacement' | 'cachet' | 'essence' | 'peage'
  | 'hebergement' | 'repas' | 'remboursement' | 'ventes' | 'autre'

export interface LedgerCategoryDef {
  key: LedgerCategory
  label: string
  defaultDirection: LedgerDirection
  emoji: string
}

/** Liste FIXE et courte — pas de taxonomie configurable (garde-fou « pas une app de compta »). */
export const LEDGER_CATEGORIES: LedgerCategoryDef[] = [
  { key: 'emplacement',   label: 'Emplacement',   defaultDirection: 'out', emoji: '🏬' },
  { key: 'cachet',        label: 'Cachet',        defaultDirection: 'in',  emoji: '🎤' },
  { key: 'essence',       label: 'Essence',       defaultDirection: 'out', emoji: '⛽' },
  { key: 'peage',         label: 'Péage',         defaultDirection: 'out', emoji: '🛣️' },
  { key: 'hebergement',   label: 'Hébergement',   defaultDirection: 'out', emoji: '🏨' },
  { key: 'repas',         label: 'Repas',         defaultDirection: 'out', emoji: '🍽️' },
  { key: 'remboursement', label: 'Remboursement', defaultDirection: 'in',  emoji: '↩️' },
  { key: 'ventes',        label: 'Ventes',        defaultDirection: 'in',  emoji: '🛍️' },
  { key: 'autre',         label: 'Autre',         defaultDirection: 'out', emoji: '•' },
]

export function defaultDirectionFor(category: LedgerCategory): LedgerDirection {
  return LEDGER_CATEGORIES.find(c => c.key === category)?.defaultDirection ?? 'out'
}

export function categoryLabel(category: LedgerCategory): string {
  return LEDGER_CATEGORIES.find(c => c.key === category)?.label ?? 'Autre'
}

/** Bénéfice = somme des entrants − somme des sortants. */
export function ledgerProfit(entries: { amount: number; direction: LedgerDirection }[]): number {
  return entries.reduce((sum, e) => sum + (e.direction === 'in' ? e.amount : -e.amount), 0)
}
