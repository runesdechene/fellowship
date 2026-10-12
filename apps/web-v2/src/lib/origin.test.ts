/**
 * QUOI     — tests du point de départ d'une distance.
 * POURQUOI — lot 13 : l'atelier de l'enseigne active d'abord ; sinon la position, si la personne l'a
 *            donnée ; sinon rien. Changer d'enseigne change le point de départ.
 */
import { describe, expect, test } from 'vitest'
import { distanceSentence, originFor } from './origin'

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

describe('distanceSentence', () => {
  const lyon = { latitude: 45.764, longitude: 4.8357 }
  test('depuis l’atelier, depuis la position, ou rien', () => {
    expect(
      distanceSentence(lyon, {
        kind: 'base',
        point: { latitude: 45.7772, longitude: 3.087 },
        label: 'Ton atelier',
      }),
    ).toBe('À 136 km de ton atelier')
    expect(distanceSentence(lyon, { kind: 'position', point: lyon, label: 'Ta position' })).toBe(
      'À 0 m de ta position',
    )
    expect(distanceSentence(lyon, { kind: 'none' })).toBeNull()
  })
})
