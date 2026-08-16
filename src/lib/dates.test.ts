import { describe, expect, it } from 'vitest'
import {
  daysUntil,
  formatCountdown,
  formatDayMonth,
  formatDaysShort,
  monthKey,
  monthsWindow,
  parseSqlDate,
} from './dates'

describe('parseSqlDate', () => {
  it('lit une date SQL en local, sans décalage de fuseau', () => {
    const date = parseSqlDate('2026-09-25')
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(8)
    expect(date.getDate()).toBe(25)
  })
})

describe('daysUntil', () => {
  const today = new Date(2026, 8, 14)

  it('compte les jours entiers restants', () => {
    expect(daysUntil(new Date(2026, 8, 25), today)).toBe(11)
  })

  it('rend 0 le jour même', () => {
    expect(daysUntil(new Date(2026, 8, 14, 23, 59), today)).toBe(0)
  })

  it('rend un nombre négatif pour une date passée', () => {
    expect(daysUntil(new Date(2026, 8, 1), today)).toBe(-13)
  })
})

describe('formatCountdown', () => {
  it('formate les cas particuliers', () => {
    expect(formatCountdown(0)).toBe("Aujourd'hui")
    expect(formatCountdown(1)).toBe('Demain')
    expect(formatCountdown(11)).toBe('Dans 11 jours')
  })
})

describe('formatDaysShort', () => {
  it('accorde le singulier', () => {
    expect(formatDaysShort(1)).toBe('1 jour')
    expect(formatDaysShort(27)).toBe('27 jours')
  })
})

describe('formatDayMonth', () => {
  it('rend le jour et le mois en français', () => {
    expect(formatDayMonth(new Date(2026, 8, 25))).toBe('25 septembre')
  })
})

describe('monthsWindow', () => {
  it('démarre au mois courant et enchaîne les suivants', () => {
    const slots = monthsWindow(12, new Date(2026, 7, 16))
    expect(slots).toHaveLength(12)
    expect(slots[0].label).toBe('Août')
    expect(slots[0].key).toBe('2026-08')
    expect(slots[1].label).toBe('Septembre')
    expect(slots[11].key).toBe('2027-07')
  })
})

describe('monthKey', () => {
  it('complète le mois sur deux chiffres', () => {
    expect(monthKey(new Date(2026, 0, 5))).toBe('2026-01')
  })
})
