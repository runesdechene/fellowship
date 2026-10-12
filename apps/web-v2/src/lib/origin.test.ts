/**
 * QUOI     — tests du point de départ d'une distance.
 * POURQUOI — lot 13 : l'atelier de l'enseigne active d'abord ; sinon la position, si la personne l'a
 *            donnée ; sinon rien. Changer d'enseigne change le point de départ.
 */
import { describe, expect, test } from 'vitest'
import { originFor } from './origin'

const atelier = { latitude: 45.78, longitude: 3.08 }
const ici = { latitude: 48.85, longitude: 2.35 }

describe('originFor', () => {
  test('l’atelier de l’enseigne active passe avant la position', () => {
    expect(originFor('e1', new Map([['e1', atelier]]), ici)).toEqual({
      kind: 'base',
      point: atelier,
      label: 'Ton atelier',
    })
  })
  test('une enseigne sans atelier, ou un compte personnel : la position, si on l’a', () => {
    expect(originFor('e2', new Map([['e1', atelier]]), ici)).toEqual({
      kind: 'position',
      point: ici,
      label: 'Ta position',
    })
    expect(originFor(null, new Map([['e1', atelier]]), null)).toEqual({ kind: 'none' })
  })
})
