/**
 * QUOI     — tests de lib/dates.ts : les helpers de dates, fuseau Europe/Paris épinglé.
 * POURQUOI — la logique pure se teste ici, sans navigateur (méthode du dépôt : .claude/rules/dev.md).
 */
import { describe, expect, it } from 'vitest'
import {
  daysUntil,
  durationLabel,
  formatDateRange,
  formatMonthAbbr,
  formatMonthShort,
  isRecent,
  monthsAhead,
  stampYear,
  timeAgo,
  formatCountdown,
  formatDayMonth,
  formatDaysShort,
  monthKey,
  monthsWindow,
  parseSqlDate,
  todayIso,
  monthName,
} from './dates'

const d = (iso: string) => new Date(`${iso}T00:00:00`)

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
    expect(slots[0]?.label).toBe('Août')
    expect(slots[0]?.key).toBe('2026-08')
    expect(slots[1]?.label).toBe('Septembre')
    expect(slots[11]?.key).toBe('2027-07')
  })
})

describe('monthKey', () => {
  it('complète le mois sur deux chiffres', () => {
    expect(monthKey(new Date(2026, 0, 5))).toBe('2026-01')
  })
})

describe('todayIso', () => {
  it('donne le jour LOCAL, même quand UTC est encore la veille', () => {
    // 7 octobre à 0 h 30 à Paris = 6 octobre à 22 h 30 UTC.
    expect(todayIso(new Date('2026-10-06T22:30:00Z'))).toBe('2026-10-07')
  })
  it('complète le mois et le jour sur deux chiffres', () => {
    expect(todayIso(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('formatDateRange', () => {
  it('un seul jour', () => {
    expect(formatDateRange(d('2026-10-30'), d('2026-10-30'))).toBe('30 oct.')
  })
  it('plusieurs jours du même mois', () => {
    expect(formatDateRange(d('2026-10-25'), d('2026-10-27'))).toBe('25–27 oct.')
  })
  it('à cheval sur deux mois', () => {
    expect(formatDateRange(d('2026-10-30'), d('2026-11-02'))).toBe('30 oct.–2 nov.')
  })
  it('en toutes lettres pour la carte de prochaine date', () => {
    expect(formatDateRange(d('2026-09-25'), d('2026-09-27'), 'long')).toBe('25–27 septembre')
    expect(formatDateRange(d('2026-09-30'), d('2026-10-01'), 'long')).toBe('30 septembre–1 octobre')
  })
})

describe('formatMonthAbbr', () => {
  it('écrit l’abréviation française, sans point, avec une capitale', () => {
    const labels = Array.from({ length: 12 }, (_, m) => formatMonthAbbr(new Date(2026, m, 1)))
    expect(labels).toEqual([
      'Janv',
      'Févr',
      'Mars',
      'Avr',
      'Mai',
      'Juin',
      'Juil',
      'Août',
      'Sept',
      'Oct',
      'Nov',
      'Déc',
    ])
  })
})

describe('formatMonthShort', () => {
  it('garde le point de l’abréviation', () => {
    expect(formatMonthShort(new Date(2026, 8, 1))).toBe('Sept.')
    expect(formatMonthShort(new Date(2026, 4, 1))).toBe('Mai')
  })
})

describe('stampYear', () => {
  it('écrit l’année sur deux chiffres, apostrophe typographique', () => {
    expect(stampYear(d('2024-06-01'))).toBe('’24')
    expect(stampYear(d('2019-12-31'))).toBe('’19')
  })
})

describe('durationLabel', () => {
  it('compte les jours, bornes comprises', () => {
    expect(durationLabel(d('2026-10-30'), d('2026-10-30'))).toBe('1 jour')
    expect(durationLabel(d('2026-10-25'), d('2026-10-27'))).toBe('3 jours')
    expect(durationLabel(d('2026-10-31'), d('2026-11-01'))).toBe('2 jours')
  })
})

const now = new Date('2026-10-07T18:00:00')

describe('timeAgo', () => {
  it('moins d’une minute : à l’instant', () => {
    expect(timeAgo(new Date('2026-10-07T17:59:40'), now)).toBe('à l’instant')
  })

  it('en minutes, puis en heures', () => {
    expect(timeAgo(new Date('2026-10-07T17:48:00'), now)).toBe('12 min')
    expect(timeAgo(new Date('2026-10-07T16:00:00'), now)).toBe('2 h')
  })

  it('la veille : hier ; au-delà : en jours', () => {
    expect(timeAgo(new Date('2026-10-06T09:00:00'), now)).toBe('hier')
    expect(timeAgo(new Date('2026-10-03T09:00:00'), now)).toBe('4 j')
  })
})

describe('monthsAhead', () => {
  it('le premier jour du mois, N mois plus tard', () => {
    expect(monthsAhead(new Date(2026, 9, 7), 1)).toEqual(new Date(2026, 10, 1))
    expect(monthsAhead(new Date(2026, 9, 7), 12)).toEqual(new Date(2027, 9, 1))
  })
})

describe('isRecent', () => {
  const today = new Date('2026-10-07T12:00:00')
  it('vrai dans les quatorze derniers jours', () => {
    expect(isRecent('2026-10-01T09:00:00Z', today)).toBe(true)
    expect(isRecent('2026-09-01T09:00:00Z', today)).toBe(false)
  })
})

describe('monthName', () => {
  it('le mois en toutes lettres, en minuscules, pour une phrase', () => {
    expect(monthName(new Date(2027, 2, 1))).toBe('mars')
  })
})
