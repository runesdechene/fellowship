/**
 * QUOI     — ce qu'une fiche vue sans compte dit de qui y va : « 12 exposants y vont », et combien
 *            de visages restent derrière le « +N ».
 * POURQUOI — maquette 2506:233 (25/10/2026) : les visages et le nombre, jamais un nom ni un métier.
 */

/** « 12 exposants y vont », « 1 exposant y va » ; null quand personne n'y va encore. */
export function goingCount(exposants: number): string | null {
  if (exposants <= 0) return null
  return exposants === 1 ? '1 exposant y va' : `${String(exposants)} exposants y vont`
}

/** Les exposants qu'on ne voit pas : ceux sans visage montré, derrière le « +N ». */
export function hiddenFaces(exposants: number, shown: number): number {
  return Math.max(0, exposants - shown)
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
