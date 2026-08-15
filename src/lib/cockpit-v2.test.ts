// src/lib/cockpit-v2.test.ts
import { describe, it, expect } from 'vitest'
import { friseBars, busiestMonthLabel } from './cockpit-v2'
import type { SeasonMonth } from './cockpit'

/** 12 mois glissants à partir de `startMonth`, avec les compteurs donnés. */
function season(startYear: number, startMonth: number, counts: number[]): SeasonMonth[] {
  return counts.map((count, i) => {
    const abs = startMonth + i
    return { year: startYear + Math.floor(abs / 12), month: abs % 12, count, filled: count > 0 }
  })
}

describe('friseBars', () => {
  it('rend une barre par mois, dans l\'ordre reçu', () => {
    const bars = friseBars(season(2026, 3, [0,0,1,2,3,0,0,1,1,0,1,2]))
    expect(bars).toHaveLength(12)
    expect(bars[0].month).toBe(3)
    expect(bars[11].month).toBe(2)
    expect(bars[11].year).toBe(2027)
  })

  it('un mois vide a le niveau 0', () => {
    expect(friseBars(season(2026, 0, [0,0,0,0,0,0,0,0,0,0,0,0]))[0].level).toBe(0)
  })

  it('les niveaux montent avec le nombre de dates et plafonnent à 3', () => {
    const bars = friseBars(season(2026, 0, [1,2,3,9,0,0,0,0,0,0,0,0]))
    expect(bars[0].level).toBe(1)
    expect(bars[1].level).toBe(2)
    expect(bars[2].level).toBe(3)
    expect(bars[3].level).toBe(3)
  })

  it('le premier mois de la fenêtre est le mois courant', () => {
    const bars = friseBars(season(2026, 7, [1,0,0,0,0,0,0,0,0,0,0,0]))
    expect(bars[0].isNow).toBe(true)
    expect(bars.slice(1).every(b => !b.isNow)).toBe(true)
  })

  it('porte l\'initiale française du mois', () => {
    const bars = friseBars(season(2026, 0, [0,0,0,0,0,0,0,0,0,0,0,0]))
    expect(bars.map(b => b.initial)).toEqual(['J','F','M','A','M','J','J','A','S','O','N','D'])
  })

  it('une entrée vide en donne une par mois reçu, jamais plus', () => {
    expect(friseBars([])).toHaveLength(0)
    expect(friseBars(season(2026, 0, [0,0,0,0,0,0,0,0,0,0,0,0]))).toHaveLength(12)
  })
})

describe('busiestMonthLabel', () => {
  it('nomme le mois le plus chargé et son nombre de dates', () => {
    expect(busiestMonthLabel(season(2026, 0, [1,0,3,0,0,0,0,0,0,0,0,0])))
      .toBe('Ton mois le plus chargé : mars, 3 dates.')
  })
  it('accorde au singulier', () => {
    expect(busiestMonthLabel(season(2026, 0, [1,0,0,0,0,0,0,0,0,0,0,0])))
      .toBe('Ton mois le plus chargé : janvier, 1 date.')
  })
  it('en cas d\'égalité, le premier mois de la fenêtre gagne', () => {
    expect(busiestMonthLabel(season(2026, 0, [2,0,2,0,0,0,0,0,0,0,0,0])))
      .toBe('Ton mois le plus chargé : janvier, 2 dates.')
  })
  it('saison vide → null (l\'appelant affiche une invitation à la place)', () => {
    expect(busiestMonthLabel(season(2026, 0, [0,0,0,0,0,0,0,0,0,0,0,0]))).toBeNull()
    expect(busiestMonthLabel([])).toBeNull()
  })
})
