/**
 * QUOI     — ce qu'une fiche vue sans compte dit de qui y va : « 12 exposants y vont : forgeron,
 *            auteur… », et la lecture des métiers rendus par apercu_fiche.
 * POURQUOI — décision du 23/10/2026 : le nombre et les métiers, jamais un visage ni un nom.
 * ATTENTION — les métiers sont du texte libre (« Marque de vêtement ») : pas de compte par métier
 *            ni de pluriel, qui écriraient des fautes ; seule la première lettre passe en minuscule.
 */
import type { Json } from '@/types/supabase'

export interface Metier {
  metier: string
  n: number
}

/** Les métiers de la base, en écartant ce qui n'a pas la forme { metier, n }. */
export function metiersFrom(json: Json): Metier[] {
  if (!Array.isArray(json)) return []
  return json.flatMap((item) =>
    item !== null &&
    typeof item === 'object' &&
    !Array.isArray(item) &&
    typeof item.metier === 'string' &&
    typeof item.n === 'number'
      ? [{ metier: item.metier, n: item.n }]
      : [],
  )
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

/** Les deux temps de la ligne : le nombre (en gras), puis les métiers. */
export interface GoingLine {
  count: string
  crafts: string | null
}

export function goingLine(exposants: number, metiers: Metier[]): GoingLine | null {
  if (exposants <= 0) return null
  const count = exposants === 1 ? '1 exposant y va' : `${String(exposants)} exposants y vont`
  if (metiers.length === 0) return { count, crafts: null }
  const named = metiers.reduce((sum, metier) => sum + metier.n, 0)
  const more = named < exposants ? '…' : ''
  return { count, crafts: metiers.map((metier) => lowerFirst(metier.metier)).join(', ') + more }
}

/** Le lien vers les avis qu'un visiteur ne lit pas encore : sans extrait affiché, aucun n'est
 *  « autre ». Null quand tout est déjà montré. */
export function moreReviewsLink(reviews: number, excerptShown: boolean): string | null {
  const hidden = excerptShown ? reviews - 1 : reviews
  if (hidden <= 0) return null
  if (hidden === 1)
    return `Lire ${excerptShown ? 'l’autre avis' : 'l’avis'}, avec ton compte gratuit`
  const others = excerptShown ? 'autres ' : ''
  return `Lire les ${String(hidden)} ${others}avis, avec ton compte gratuit`
}
