/**
 * QUOI     — les tests de lib/name-line.ts : « Gautier et Uriel y vont aussi ».
 * POURQUOI — une phrase lue partout (fiche, vitrine) ; un pluriel faux s'y voit tout de suite.
 */
import { describe, expect, it, test } from 'vitest'
import { nameLine, namesLine } from './name-line'

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

describe('namesLine — la fiche nomme jusqu’à trois amis', () => {
  const verb = { one: 'y va aussi', many: 'y vont aussi' }
  test('un, deux, trois', () => {
    expect(namesLine(['A'], verb)).toEqual([{ strong: 'A' }, ' y va aussi'])
    expect(namesLine(['A', 'B'], verb)).toEqual([
      { strong: 'A' },
      ' et ',
      { strong: 'B' },
      ' y vont aussi',
    ])
    expect(namesLine(['A', 'B', 'C'], verb)).toEqual([
      { strong: 'A' },
      ', ',
      { strong: 'B' },
      ' et ',
      { strong: 'C' },
      ' y vont aussi',
    ])
  })
  test('au-delà de trois : les trois premiers, puis le reste compté', () => {
    expect(namesLine(['A', 'B', 'C', 'D', 'E'], verb)).toEqual([
      { strong: 'A' },
      ', ',
      { strong: 'B' },
      ', ',
      { strong: 'C' },
      ' et 2 autres y vont aussi',
    ])
    expect(namesLine(['A', 'B', 'C', 'D'], verb).at(-1)).toBe(' et 1 autre y vont aussi')
  })
  test('personne', () => {
    expect(namesLine([], verb)).toEqual([])
  })
})
