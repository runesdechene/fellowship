// COPIE de apps/web-v2/src/lib/event-path.ts — ne pas modifier : node apps/web-v2/scripts/sync-push-phrases.mjs
/**
 * QUOI     — l'adresse d'une fiche (`/evenements/fenrir-2027`) et de ses sous-pages.
 * POURQUOI — une fiche s'écrit à un seul endroit. La clé est son slug ; un écran qui n'a que
 *            l'identifiant le passe tel quel : EventRoute remplace l'adresse par le slug actuel.
 */
export type EventSubPage = 'modifier' | 'historique' | 'avis' | `historique/${string}`

export function eventPath(key: string, sub?: EventSubPage): string {
  return `/evenements/${key}${sub ? `/${sub}` : ''}`
}

/** `/evenement/<id>/…` et `/e/<slug>` (les adresses d'avant le 25/10/2026) → `/evenements/…`. */
export function legacyEventPath(pathname: string): string {
  return pathname.replace(/^\/(evenement|e)\//, '/evenements/')
}
