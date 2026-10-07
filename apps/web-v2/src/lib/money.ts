/* -----------------------------------------------------------------------------
   Argent — les montants d'un bilan viennent du REGISTRE (event_ledger_entries),
   pas des colonnes revenue / booth_cost / charges de event_reports, qui sont
   un reliquat de l'ancien modèle et ne sont plus alimentées.

   Chaque ligne du registre porte un montant et un sens :
     'in'  = ce qui rentre (ventes, cachet, remboursement)
     'out' = ce qui sort  (emplacement, essence, péage, hébergement, repas)
   -------------------------------------------------------------------------- */

export interface LedgerLine {
  amount: number
  direction: string
}

/** Ce qui est rentré — le « CA / Reçu » affiché en premier sur une carte. */
export function ledgerRevenue(lines: LedgerLine[]): number {
  return lines.reduce((sum, line) => (line.direction === 'in' ? sum + line.amount : sum), 0)
}

/** Bénéfice = somme des entrants − somme des sortants. */
export function ledgerProfit(lines: LedgerLine[]): number {
  return lines.reduce(
    (sum, line) => sum + (line.direction === 'in' ? line.amount : -line.amount),
    0,
  )
}

/** « 5 400 € » — un montant, sans décimales. */
export function formatEuros(amount: number): string {
  return `${Math.round(amount).toLocaleString('fr-FR')} €`
}

/** « +4 720 € » / « −310 € » — un résultat net, toujours signé. */
export function formatSignedEuros(amount: number): string {
  const rounded = Math.round(amount)
  const sign = rounded >= 0 ? '+' : '−'
  return `${sign}${Math.abs(rounded).toLocaleString('fr-FR')} €`
}
