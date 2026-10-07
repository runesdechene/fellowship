/**
 * QUOI     — la logique pure des avis d'exposants : la note affichée (« 4,3 »), le nombre
 *            d'étoiles, la signature d'un avis.
 * POURQUOI — l'identité d'un auteur est protégée : seule la base (get_event_reviews) dit si elle
 *            peut se montrer, et la signature n'en dit jamais plus.
 */

const SCORE_FORMATTER = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/** « 4,3 » */
export function formatScore(score: number): string {
  return SCORE_FORMATTER.format(score)
}

/** Les étoiles pleines d'une note sur cinq. */
export function starsOf(score: number): number {
  return Math.min(5, Math.max(0, Math.round(score)))
}

/** « Un exposant, édition 2025 », ou le nom quand la base autorise à le montrer. */
export function reviewSignature(review: {
  identityVisible: boolean
  authorLabel: string | null
  createdAt: string
}): string {
  const who = review.identityVisible && review.authorLabel ? review.authorLabel : 'Un exposant'
  return `${who}, édition ${new Date(review.createdAt).getFullYear()}`
}
