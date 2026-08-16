/* -----------------------------------------------------------------------------
   Argent — mise en forme des montants des bilans.
   Les montants sont stockés en euros (numeric Postgres), pas en centimes.
   -------------------------------------------------------------------------- */

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

/**
 * Le net d'un bilan : ce qui rentre moins tout ce qui sort.
 * Un champ vide vaut zéro — un bilan partiel reste calculable.
 */
export function netResult(input: {
  revenue: number | null
  booth_cost: number | null
  charges: number | null
}): number {
  return (input.revenue ?? 0) - (input.booth_cost ?? 0) - (input.charges ?? 0)
}
