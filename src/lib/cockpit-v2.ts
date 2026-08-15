// src/lib/cockpit-v2.ts
// Logique de présentation du Cockpit V2. Elle vit ici, en fonctions pures, parce
// que ce projet ne peut pas tester du JSX (React 19 + RTL 16 ne flushent pas les
// rendus concurrents en synchrone). Le composant n'est qu'une coquille.
import type { SeasonMonth } from './cockpit'

/** Initiale française du mois, index 0-11. Deux J, deux M, deux A : c'est voulu,
 *  la frise porte l'initiale seule comme dans la maquette. */
const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const MONTH_NAMES = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

export interface FriseBar {
  year: number
  month: number
  count: number
  /** Hauteur de la barre : 0 = socle (mois vide), 3 = plafond. */
  level: 0 | 1 | 2 | 3
  /** Le mois courant — toujours le premier de la fenêtre glissante. */
  isNow: boolean
  initial: string
}

function levelFor(count: number): 0 | 1 | 2 | 3 {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  return 3
}

export function friseBars(season: SeasonMonth[]): FriseBar[] {
  return season.map((m, i) => ({
    year: m.year,
    month: m.month,
    count: m.count,
    level: levelFor(m.count),
    isNow: i === 0,
    initial: MONTH_INITIALS[m.month],
  }))
}

/** La phrase sous la frise. `null` quand la saison est vide : l'appelant affiche
 *  alors une invitation à trouver des dates plutôt qu'un superlatif sur zéro. */
export function busiestMonthLabel(season: SeasonMonth[]): string | null {
  let best: SeasonMonth | null = null
  for (const m of season) {
    if (m.count > 0 && (best === null || m.count > best.count)) best = m
  }
  if (!best) return null
  const plural = best.count > 1 ? 's' : ''
  return `Ton mois le plus chargé : ${MONTH_NAMES[best.month]}, ${best.count} date${plural}.`
}
