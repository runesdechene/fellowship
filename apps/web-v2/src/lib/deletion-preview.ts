/**
 * QUOI     — la forme de l'aperçu que rend `delete-account` avant une suppression de compte.
 * POURQUOI — Réglages (sa propre suppression) et l'administration (celle d'un autre compte) lisent
 *            la même réponse : un seul type, hors de toute fonctionnalité.
 */
export interface DeletionPreview {
  deleted: { entityActorId: string; brandName: string; subscribed: boolean }[]
  /** endsOn : la fin de la période payée, quand l'abonnement de l'enseigne s'y arrête. */
  kept: { entityActorId: string; brandName: string; endsOn: string | null }[]
}
