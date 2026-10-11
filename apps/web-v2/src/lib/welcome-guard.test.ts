/**
 * QUOI     — tests du garde d'arrivée : quelle arrivée faire selon la personne et ses enseignes.
 * POURQUOI — un garde faux boucle sur /bienvenue ou crée une seconde enseigne par erreur.
 */
import { expect, test } from 'vitest'
import { welcomeKind } from './welcome-guard'

test('sans prénom ni enseigne : l’arrivée complète', () => {
  expect(welcomeKind({ display_name: null }, 0, null)).toBe('new')
  expect(welcomeKind({ display_name: '  ' }, 0, null)).toBe('new')
})
test('une enseigne mais pas de prénom : le prénom seul', () => {
  expect(welcomeKind({ display_name: null }, 1, null)).toBe('nameOnly')
})
test('un prénom : rien à faire, sauf une nouvelle enseigne demandée', () => {
  expect(welcomeKind({ display_name: 'Uriel' }, 0, null)).toBeNull()
  expect(welcomeKind({ display_name: 'Uriel' }, 2, 'nouvelle-enseigne')).toBe('newEntity')
})
test('identité pas encore lue : on n’envoie nulle part', () => {
  expect(welcomeKind(null, 0, null)).toBeNull()
})
