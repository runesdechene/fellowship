/**
 * L'état d'un cran du suivi.
 *
 * `done` : franchi, la case est pleine.
 * `next` : la prochaine chose à faire — contour appuyé, mais case VIDE. Rien
 *          n'est rempli tant que rien n'est fait.
 * `todo` : plus loin sur le chemin.
 */
export type StepState = 'done' | 'next' | 'todo'

/**
 * Les crans de participation : franchir une étape coche TOUT ce qui précède.
 * Être inscrit implique d'avoir été intéressé — l'inverse n'aurait aucun sens.
 *
 * `current` vaut -1 quand on n'est pas du tout sur la date.
 */
export function participationState(index: number, current: number): StepState {
  if (current >= index) return 'done'
  if (current + 1 === index) return 'next'
  return 'todo'
}

/**
 * Les crans de paiement, où le premier n'est PAS un acquis : « à payer »
 * décrit une dette, pas une chose faite. Le cocher ferait dire à la case le
 * contraire de ce qu'elle montre.
 */
export function paymentState(index: number, current: number): StepState {
  if (current <= 0) return index === 0 ? 'next' : 'todo'
  if (current >= index) return 'done'
  if (current + 1 === index) return 'next'
  return 'todo'
}
