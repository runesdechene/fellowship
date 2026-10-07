/**
 * QUOI     — les tests de lib/name-line.ts : « Gautier et Uriel y vont aussi ».
 * POURQUOI — une phrase lue partout (fiche, vitrine) ; un pluriel faux s'y voit tout de suite.
 */
import { describe, expect, it } from 'vitest'
import { nameLine } from './name-line'

const goes = { one: 'y va aussi', many: 'y vont aussi' }

describe('nameLine', () => {
  it('personne : rien', () => {
    expect(nameLine([], goes)).toBeNull()
  })

  it('un nom : le verbe au singulier', () => {
    expect(nameLine(['Gautier'], goes)).toEqual({ first: 'Gautier', rest: ' y va aussi' })
  })

  it('deux noms : le second est nommé', () => {
    expect(nameLine(['Gautier', 'Uriel'], goes)).toEqual({
      first: 'Gautier',
      rest: ' et Uriel y vont aussi',
    })
  })

  it('au-delà : on compte les autres', () => {
    expect(nameLine(['Gautier', 'Uriel', 'Iva'], goes)).toEqual({
      first: 'Gautier',
      rest: ' et 2 autres y vont aussi',
    })
  })
})
