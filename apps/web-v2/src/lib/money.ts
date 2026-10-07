/**
 * QUOI     — tous les montants : recette et bénéfice d'une date à partir de son registre, et
 *            leur affichage en euros.
 * POURQUOI — les montants d'un bilan viennent du REGISTRE (event_ledger_entries), pas des
 *            colonnes revenue / booth_cost / charges de event_reports, reliquat de l'ancien
 *            modèle qui n'est plus alimenté.
 *
 * Chaque ligne du registre porte un montant et un sens :
 *   'in'  = ce qui rentre (ventes, cachet, remboursement)
 *   'out' = ce qui sort  (emplacement, essence, péage, hébergement, repas)
 */

export interface LedgerLine {
  amount: number
  direction: string
}

/**
 * La ligne de registre du montant saisi sur la fiche. Un emplacement SORT, un cachet ENTRE :
 * c'est l'orientation (qui paie qui) qui décide, et le montant reste toujours positif en base.
 */
export function standLine(orientation: 'payeur' | 'paye'): {
  direction: 'in' | 'out'
  category: 'cachet' | 'emplacement'
} {
  return orientation === 'paye'
    ? { direction: 'in', category: 'cachet' }
    : { direction: 'out', category: 'emplacement' }
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
