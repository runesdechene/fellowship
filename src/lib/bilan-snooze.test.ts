import { describe, it, expect } from 'vitest'
import { todayKey, snoozedSetForDay, addSnooze } from './bilan-snooze'

describe('todayKey', () => {
  it('retourne la date du jour au format AAAA-MM-JJ (UTC, déterministe)', () => {
    expect(todayKey(new Date('2026-05-15T12:00:00Z'))).toBe('2026-05-15')
  })
})

describe('snoozedSetForDay', () => {
  it('ne garde que les events snoozés POUR le jour donné', () => {
    const map = { e1: '2026-05-15', e2: '2026-05-14' }
    const set = snoozedSetForDay(map, '2026-05-15')
    expect(set.has('e1')).toBe(true)
    expect(set.has('e2')).toBe(false)  // snooze d'hier = expiré
  })

  it('ensemble vide si la map est vide', () => {
    expect(snoozedSetForDay({}, '2026-05-15').size).toBe(0)
  })
})

describe('addSnooze', () => {
  it('ajoute l’event pour aujourd’hui et purge les snoozes périmés (autres jours)', () => {
    const next = addSnooze({ e2: '2026-05-14' }, 'e1', '2026-05-15')
    expect(next).toEqual({ e1: '2026-05-15' })  // e2 (hier) purgé
  })

  it('conserve les autres snoozes du même jour', () => {
    const next = addSnooze({ e3: '2026-05-15' }, 'e1', '2026-05-15')
    expect(next).toEqual({ e3: '2026-05-15', e1: '2026-05-15' })
  })
})
