/**
 * QUOI     — le verrouillage des recettes chiffrées après 15 minutes sans activité : `isIdle`.
 * POURQUOI — une clé laissée en mémoire sur un ordinateur ouvert lit toutes les recettes de l'enseigne
 *            (Uriel, 31/10/2026). Le fournisseur de lib/revenue-key.tsx l'abandonne passé ce délai.
 * ATTENTION — on compare des horodatages, jamais un minuteur : un onglet en arrière-plan ralentit les
 *            minuteries, l'horloge, elle, ne ment pas.
 */

export const IDLE_LIMIT_MS = 15 * 60 * 1000

export function isIdle(lastActivity: number, now: number): boolean {
  return now - lastActivity >= IDLE_LIMIT_MS
}
