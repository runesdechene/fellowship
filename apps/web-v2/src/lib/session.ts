/**
 * QUOI     — décide quels événements de session doivent relire l'identité (personne, enseignes).
 * POURQUOI — Supabase rafraîchit le jeton régulièrement, et à chaque retour sur l'onglet : relire
 *            l'identité à chaque fois multipliait les requêtes, et un raté réseau à ce moment-là
 *            pouvait la vider. L'identité ne change qu'à l'ouverture, à la connexion, ou quand le
 *            compte lui-même change.
 */
import type { AuthChangeEvent } from '@supabase/supabase-js'

const RELOADING_EVENTS: ReadonlySet<AuthChangeEvent> = new Set([
  'INITIAL_SESSION',
  'SIGNED_IN',
  'USER_UPDATED',
])

export function shouldLoadIdentity(event: AuthChangeEvent): boolean {
  return RELOADING_EVENTS.has(event)
}
