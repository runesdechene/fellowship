/**
 * QUOI     — tests de lib/reports.ts : bilan rempli, chiffres d'une date, résumé de l'année.
 * POURQUOI — toute la logique des bilans se vérifie ici, sans navigateur.
 */
import { describe, expect, it } from 'vitest'
import {
  bestMonth,
  isFilled,
  reportFigures,
  secretLines,
  yearSummary,
  type ReportDate,
} from './reports'

function date(overrides: Partial<ReportDate> = {}): ReportDate {
  return {
    eventId: 'e1',
    name: 'Les Aventuriales',
    imageUrl: null,
    tags: null,
    place: 'Ménétrole (63)',
    startDate: new Date(2026, 5, 25),
    endDate: new Date(2026, 5, 27),
    lines: [],
    secret: 'none',
    ...overrides,
  }
}

const stand = { amount: 450, direction: 'out', source: 'stepper' }
const sales = { amount: 3980, direction: 'in', source: 'manual' }
const fuel = { amount: 186, direction: 'out', source: 'manual' }

describe('isFilled', () => {
  it('une ligne de Mon dossier seule ne remplit pas un bilan', () => {
    expect(isFilled([stand])).toBe(false)
  })
  it('une ligne saisie dans le bilan le remplit', () => {
    expect(isFilled([stand, fuel])).toBe(true)
  })
  it('sans ligne, le bilan est vide', () => {
    expect(isFilled([])).toBe(false)
  })
})

describe('reportFigures', () => {
  it('compte toutes les lignes, celle de Mon dossier comprise', () => {
    expect(reportFigures(date({ lines: [stand, sales, fuel] }))).toEqual({
      filled: true,
      revenue: 3980,
      costs: 636,
      net: 3344,
      days: 3,
      masked: false,
    })
  })
  it('une date chiffrée sans ligne saisie compte comme remplie', () => {
    expect(reportFigures(date({ secret: 'masked' })).filled).toBe(true)
  })
  it('une date chiffrée verrouillée est masquée, une ouverte ne l’est pas', () => {
    expect(reportFigures(date({ secret: 'masked' })).masked).toBe(true)
    expect(reportFigures(date({ secret: 'open' })).masked).toBe(false)
  })
  it('une date d’un jour dure un jour', () => {
    const day = new Date(2026, 6, 4)
    expect(reportFigures(date({ startDate: day, endDate: day })).days).toBe(1)
  })
})

describe('yearSummary', () => {
  it('une année vide rend des zéros et aucune meilleure date', () => {
    const summary = yearSummary([], null)
    expect(summary.filledCount).toBe(0)
    expect(summary.best).toBeNull()
    expect(summary.revenueChange).toBeNull()
    expect(summary.months).toHaveLength(12)
    expect(summary.months.every((month) => month === 0)).toBe(true)
  })

  it('ignore les bilans non remplis, même avec le prix de la place', () => {
    const summary = yearSummary([date({ lines: [stand] })], null)
    expect(summary.net).toBe(0)
    expect(summary.filledCount).toBe(0)
  })

  it('additionne les bilans remplis et range le bénéfice au mois de début', () => {
    const june = date({ eventId: 'a', lines: [sales, fuel] })
    const straddling = date({
      eventId: 'b',
      startDate: new Date(2026, 6, 31),
      endDate: new Date(2026, 7, 2),
      lines: [{ amount: 1000, direction: 'in', source: 'manual' }],
    })
    const summary = yearSummary([june, straddling], null)
    expect(summary.net).toBe(3794 + 1000)
    expect(summary.revenue).toBe(4980)
    expect(summary.costs).toBe(186)
    expect(summary.filledCount).toBe(2)
    expect(summary.months[5]).toBe(3794)
    expect(summary.months[6]).toBe(1000)
    expect(summary.months[7]).toBe(0)
  })

  it('à égalité, la meilleure date est la plus récente', () => {
    const line = [{ amount: 500, direction: 'in', source: 'manual' }]
    const older = date({
      eventId: 'old',
      startDate: new Date(2026, 2, 1),
      endDate: new Date(2026, 2, 1),
      lines: line,
    })
    const newer = date({
      eventId: 'new',
      startDate: new Date(2026, 8, 1),
      endDate: new Date(2026, 8, 2),
      lines: line,
    })
    const summary = yearSummary([older, newer], null)
    expect(summary.best?.eventId).toBe('new')
    expect(summary.bestNet).toBe(500)
    expect(summary.bestDays).toBe(2)
  })

  it('compare le chiffre d’affaires à l’année précédente, en pourcentage arrondi', () => {
    expect(yearSummary([date({ lines: [sales] })], 3373).revenueChange).toBe(18)
  })

  it('sans chiffre l’année précédente, pas de comparaison', () => {
    expect(yearSummary([date({ lines: [sales] })], 0).revenueChange).toBeNull()
  })

  it('une date chiffrée masquée rend l’année masquée', () => {
    const clear = date({
      eventId: 'a',
      lines: [{ amount: 1000, direction: 'in', source: 'manual' }],
    })
    const masked = date({ eventId: 'b', secret: 'masked' })
    expect(yearSummary([clear, masked], null).masked).toBe(true)
    expect(yearSummary([clear], null).masked).toBe(false)
  })

  it('une date chiffrée ouverte s’additionne comme une date claire', () => {
    const open = date({
      secret: 'open',
      lines: [
        ...secretLines({ carte: 2830, especes: 1380 }),
        { amount: 1340, direction: 'out', source: 'stepper' },
      ],
    })
    const summary = yearSummary([open], null)
    expect(summary.revenue).toBe(4210)
    expect(summary.net).toBe(2870)
    expect(summary.masked).toBe(false)
  })
})

describe('secretLines', () => {
  it('rend la carte et les espèces en deux entrées saisies', () => {
    expect(secretLines({ carte: 10, especes: 5 })).toEqual([
      { amount: 10, direction: 'in', source: 'manual' },
      { amount: 5, direction: 'in', source: 'manual' },
    ])
  })
})

describe('bestMonth', () => {
  it('rend le mois du plus grand bénéfice', () => {
    expect(bestMonth([0, 0, 1800, 2600, 4100, 6900, 9400, 8300, 5200, 4100, 0, 0])).toBe(6)
  })
  it('sans bénéfice positif, aucun mois', () => {
    expect(bestMonth(Array<number>(12).fill(0))).toBeNull()
  })
})
