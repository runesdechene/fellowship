/**
 * QUOI     — tests de lib/trend-line.ts : graduations, place des points, tracé lissé.
 * POURQUOI — la logique pure se teste ici, sans navigateur (méthode du dépôt : .claude/rules/dev.md).
 */
import { describe, expect, it } from 'vitest'
import { niceTicks, placePoints, smoothPath } from './trend-line'

describe('niceTicks', () => {
  it('monte en pas ronds jusqu’au-dessus du maximum', () => {
    expect(niceTicks(5)).toEqual([0, 2, 4, 6])
    expect(niceTicks(14)).toEqual([0, 5, 10, 15])
    expect(niceTicks(1)).toEqual([0, 1])
    expect(niceTicks(120)).toEqual([0, 50, 100, 150])
  })

  it('garde une échelle quand tout est à zéro', () => {
    expect(niceTicks(0)).toEqual([0, 1])
  })
})

describe('placePoints', () => {
  it('pose zéro en bas, le haut de l’échelle en haut, de gauche à droite', () => {
    expect(placePoints([0, 3, 6], 100, 60, 6)).toEqual([
      [0, 60],
      [50, 30],
      [100, 0],
    ])
  })
})

describe('smoothPath', () => {
  it('passe par chaque point', () => {
    const path = smoothPath([
      [0, 60],
      [50, 30],
      [100, 0],
    ])
    expect(path.startsWith('M0,60')).toBe(true)
    expect(path).toContain(' 50,30')
    expect(path.endsWith(' 100,0')).toBe(true)
  })

  it('reste plat entre deux valeurs égales, sans bosse', () => {
    const path = smoothPath([
      [0, 10],
      [10, 10],
      [20, 10],
    ])
    const heights = path.match(/,-?[\d.]+/g) ?? []
    expect(heights).toHaveLength(7)
    expect(heights.every((height) => height === ',10')).toBe(true)
  })
})
