/**
 * QUOI     — la logique pure de l'Explorer : les choix de « Quand », le titre des résultats, le
 *            motif d'une recherche par mot.
 * POURQUOI — l'écran ne fait qu'afficher ; ce qui se calcule se teste seul (explorer.test.ts).
 * ATTENTION — le motif retire les caractères qui casseraient un filtre PostgREST (virgule,
 *            parenthèses, %, _) : une recherche ne doit jamais faire échouer la requête.
 */

export const QUAND_OPTIONS = [
  { value: '12', label: 'Les 12 prochains mois', months: 12 },
  { value: '3', label: 'Les 3 prochains mois', months: 3 },
  { value: '1', label: 'Ce mois-ci', months: 1 },
] as const

/** Le nombre de mois de la fenêtre, lu dans l'adresse ; douze par défaut. */
export function quandMonths(value: string | null): number {
  return QUAND_OPTIONS.find((option) => option.value === value)?.months ?? 12
}

/** « 22 résultats pour « Lyon » », « Aucun résultat pour « Lyon » ». */
export function resultsTitle(count: number, query: string): string {
  if (count === 0) return `Aucun résultat pour « ${query} »`
  return `${count} ${count > 1 ? 'résultats' : 'résultat'} pour « ${query} »`
}

/** « %Lyon% » pour un `ilike`, ou null s'il ne reste rien à chercher. */
export function searchPattern(query: string): string | null {
  const cleaned = query.replace(/[%_,()]/g, '').trim()
  return cleaned === '' ? null : `%${cleaned}%`
}
