/**
 * QUOI     — les dernières recherches de cet appareil, pour « Récemment » dans la recherche plein
 *            écran : les lire, en retenir une.
 * POURQUOI — maquette 2606:249 : retrouver d'un geste ce qu'on cherchait hier. Un confort propre à
 *            l'appareil, donc le stockage du navigateur ; il peut manquer (navigation privée).
 */
const KEY = 'fellowship:recherches'
export const MAX_RECENT = 5

/** La liste après une recherche : la plus récente en tête, sans doublon (casse comprise), bornée. */
export function withRecent(list: readonly string[], words: string): string[] {
  const clean = words.trim()
  if (clean === '') return [...list]
  const others = list.filter((item) => item.toLowerCase() !== clean.toLowerCase())
  return [clean, ...others].slice(0, MAX_RECENT)
}

export function readRecent(): string[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

export function rememberSearch(words: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(withRecent(readRecent(), words)))
  } catch {
    // Stockage refusé : « Récemment » restera vide, la recherche marche quand même.
  }
}
