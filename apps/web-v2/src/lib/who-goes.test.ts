/**
 * QUOI     — tests de la liste « Qui y va » : le statut de chaque ami, et l'ordre.
 * POURQUOI — la popup dit qui est validé (vert) et qui attend (dossier envoyé) : un statut mal lu
 *            y mentirait sur l'engagement d'un ami.
 */
import { expect, test } from 'vitest'
import { goerStatus, sortGoers } from './who-goes'

test('inscrit et confirmé se disent « Inscrit », validés ; en cours, « Dossier envoyé »', () => {
  expect(goerStatus('inscrit')).toEqual({ label: 'Inscrit', validated: true })
  expect(goerStatus('confirme')).toEqual({ label: 'Inscrit', validated: true })
  expect(goerStatus('en_cours')).toEqual({ label: 'Dossier envoyé', validated: false })
})

test('un statut hors de la liste ne s’affiche pas', () => {
  expect(goerStatus('interesse')).toBeNull()
  expect(goerStatus('refuse')).toBeNull()
  expect(goerStatus(null)).toBeNull()
})

test('les inscrits d’abord, puis par nom', () => {
  const goers = [
    { name: 'Tom', status: 'en_cours' },
    { name: 'lina', status: 'inscrit' },
    { name: 'Gautier', status: 'confirme' },
  ]
  expect(sortGoers(goers).map((goer) => goer.name)).toEqual(['Gautier', 'lina', 'Tom'])
})
