/**
 * QUOI     — tests de lib/admin-board.ts : place dans le paquet, ancienneté, réchauffement,
 *            semaine, effacement et jours de « Terminé ».
 * POURQUOI — la logique pure se teste ici, sans navigateur (méthode du dépôt : .claude/rules/dev.md).
 */
import { describe, expect, it } from 'vitest'
import {
  doneSince,
  doneThisWeek,
  fadeFor,
  groupByDay,
  insertPosition,
  isStale,
  laterPosition,
  sinceLabel,
  victoryPhrase,
} from './admin-board'

// Un jeudi après-midi.
const now = new Date('2026-10-22T15:00:00')

describe('insertPosition', () => {
  it('un paquet vide commence à zéro', () => {
    expect(insertPosition([], false)).toBe(0)
    expect(insertPosition([], true)).toBe(0)
  })
  it('une carte urgente passe dessus', () => {
    expect(insertPosition([2, 5, 9], true)).toBe(1)
  })
  it('une carte ordinaire tombe au hasard entre le dessus et le dessous', () => {
    expect(insertPosition([2, 5, 10], false, () => 0.5)).toBe(6)
    expect(insertPosition([2, 5, 10], false, () => 0)).toBe(2)
  })
})

describe('laterPosition', () => {
  it('passe sous toutes les autres', () => {
    expect(laterPosition([2, 5, 9])).toBe(10)
    expect(laterPosition([])).toBe(0)
  })
})

describe('sinceLabel', () => {
  it('compte en jours', () => {
    expect(sinceLabel('2026-10-22T08:00:00', now)).toBe('depuis aujourd’hui')
    expect(sinceLabel('2026-10-21T23:00:00', now)).toBe('depuis hier')
    expect(sinceLabel('2026-10-19T10:00:00', now)).toBe('depuis 3 jours')
  })
})

describe('isStale', () => {
  it('se réchauffe à 5 jours', () => {
    expect(isStale('2026-10-18T10:00:00', now)).toBe(false)
    expect(isStale('2026-10-17T10:00:00', now)).toBe(true)
  })
})

describe('doneThisWeek', () => {
  it('compte depuis lundi minuit', () => {
    const moved = ['2026-10-19T00:00:00', '2026-10-18T23:59:00', '2026-10-22T09:00:00']
    expect(doneThisWeek(moved, now)).toBe(2)
  })
})

describe('doneSince', () => {
  it('remonte de sept jours', () => {
    expect(doneSince(now)).toEqual(new Date('2026-10-15T15:00:00'))
  })
})

describe('fadeFor', () => {
  it('pâlit chaque jour sans jamais disparaître tout à fait', () => {
    expect(fadeFor(0)).toBe(1)
    expect(fadeFor(2)).toBeCloseTo(0.7)
    expect(fadeFor(9)).toBe(0.1)
  })
})

describe('groupByDay', () => {
  it('range par jour, le plus récent d’abord', () => {
    const tasks = [
      { id: 'a', movedAt: '2026-10-19T10:00:00' },
      { id: 'b', movedAt: '2026-10-22T09:00:00' },
      { id: 'c', movedAt: '2026-10-22T11:00:00' },
    ]
    const days = groupByDay(tasks, now)
    expect(days.map((d) => d.daysAgo)).toEqual([0, 3])
    expect(days[0]?.tasks.map((t) => t.id)).toEqual(['c', 'b'])
  })
})

describe('victoryPhrase', () => {
  it('suit la journée, et salue le paquet vidé', () => {
    expect(victoryPhrase(1, false)).toBe('Première carte. C’est parti.')
    expect(victoryPhrase(3, false)).toBe('Trois aujourd’hui. Ça roule.')
    expect(victoryPhrase(4, false)).toBe('Une de moins.')
    expect(victoryPhrase(2, true)).toBe('Paquet vide. Tout est fait.')
  })
})
