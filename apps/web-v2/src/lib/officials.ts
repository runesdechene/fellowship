/**
 * QUOI     — les comptes officiels (Fellowship) : la liste que la base publie, et l'ordre qui met
 *            leurs sujets en tête de la barre.
 * POURQUOI — compte officiel (Uriel, 11/11/2026, spec 2026-11-11-compte-officiel) : badge partout
 *            où son nom paraît, sujets en tête. Le badge se décide sur l'id d'acteur, sans changer
 *            chaque requête qui rend un nom.
 */
import { must, supabase } from './supabase'

export async function fetchOfficials(): Promise<Set<string>> {
  return new Set(must(await supabase.rpc('comptes_officiels')))
}

/** Les éléments d'un compte officiel d'abord, chaque groupe dans son ordre d'origine. */
export function officialFirst<T>(
  items: T[],
  authorOf: (item: T) => string,
  officials: ReadonlySet<string>,
): T[] {
  const official = items.filter((item) => officials.has(authorOf(item)))
  const others = items.filter((item) => !officials.has(authorOf(item)))
  return [...official, ...others]
}
