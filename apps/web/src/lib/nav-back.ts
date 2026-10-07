/**
 * Décide si un bouton « Retour » doit remonter l'historique réel (`navigate(-1)`)
 * plutôt que de retomber sur une destination par défaut.
 *
 * React Router attribue la key `'default'` à l'entrée initiale de l'historique.
 * - key === 'default' → on est arrivé directement (lien partagé, deep-link) :
 *   pas d'historique in-app à remonter → l'appelant prend son fallback.
 * - toute autre key → on a navigué dans l'app → `navigate(-1)` ramène au vrai écran d'origine.
 */
export function canGoBackInApp(locationKey: string | undefined): boolean {
  return !!locationKey && locationKey !== 'default'
}
