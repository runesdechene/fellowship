/**
 * QUOI     — quelle arrivée faire, selon la personne et ses enseignes.
 * POURQUOI — lot 10a : sans prénom, on passe par l'arrivée avant d'entrer ; avec une enseigne déjà
 *            là, seul le prénom ; « Créer un compte exposant » est une arrivée sans le prénom.
 * ATTENTION — une identité pas encore lue rend null : le garde n'envoie personne tant qu'il ne sait pas.
 */
import type { WelcomeKind } from './welcome'

export function welcomeKind(
  person: { display_name: string | null } | null,
  entityCount: number,
  asked: 'nouvelle-enseigne' | null,
): WelcomeKind | null {
  if (!person) return null
  const named = (person.display_name ?? '').trim() !== ''
  if (named) return asked === 'nouvelle-enseigne' ? 'newEntity' : null
  return entityCount > 0 ? 'nameOnly' : 'new'
}
