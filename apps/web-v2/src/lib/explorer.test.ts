/**
 * QUOI     — les tests de lib/explorer.ts : le titre des résultats, le motif de recherche, la
 *            fenêtre « Quand ».
 * POURQUOI — une recherche mal échappée casse la requête ; un titre mal accordé se voit en haut
 *            de l'écran.
 */
import { describe, expect, it } from 'vitest'
import {
  QUAND_OPTIONS,
  quandChoices,
  quandMonths,
  beyondWindow,
  resultsTitle,
  searchPattern,
  searchWindow,
  windowMonths,
} from './explorer'

describe('resultsTitle', () => {
  it('accorde le nombre et cite la recherche', () => {
    expect(resultsTitle(22, 'Lyon')).toBe('22 résultats pour « Lyon »')
    expect(resultsTitle(1, 'Lyon')).toBe('1 résultat pour « Lyon »')
    expect(resultsTitle(0, 'Lyon')).toBe('Aucun résultat pour « Lyon »')
  })
})

describe('searchPattern', () => {
  it('entoure de jokers et retire ce qui casserait le filtre', () => {
    expect(searchPattern('  Lyon ')).toBe('%Lyon%')
    expect(searchPattern('50%,(x)')).toBe('%50x%')
  })

  it('vide : pas de motif', () => {
    expect(searchPattern('   ')).toBeNull()
  })
})

describe('quandMonths', () => {
  it('lit la valeur de l’adresse, et retombe sur douze mois', () => {
    expect(quandMonths('3')).toBe(3)
    expect(quandMonths('1')).toBe(1)
    expect(quandMonths(null)).toBe(12)
    expect(quandMonths('n’importe quoi')).toBe(12)
  })

  it('chaque option a son libellé', () => {
    expect(QUAND_OPTIONS.map((option) => option.label)).toEqual([
      'Les 12 prochains mois',
      'Les 3 prochains mois',
      'Ce mois-ci',
    ])
  })
})

describe('quandChoices', () => {
  it('le Pro choisit jusqu’à 12 mois', () => {
    expect(quandChoices(true).map((option) => option.months)).toEqual([12, 3, 1])
  })
  it('le gratuit fouille ses 6 prochains mois au plus', () => {
    expect(quandChoices(false).map((option) => option.months)).toEqual([6, 3, 1])
  })
})

describe('windowMonths', () => {
  it('en gratuit, une adresse qui demande 12 mois est ramenée à 6', () => {
    expect(windowMonths('12', false)).toBe(6)
    expect(windowMonths(null, false)).toBe(6)
  })
  it('en gratuit, 3 mois restent 3 mois', () => {
    expect(windowMonths('3', false)).toBe(3)
  })
  it('en Pro, 12 mois par défaut', () => {
    expect(windowMonths(null, true)).toBe(12)
  })
})

describe('searchWindow', () => {
  const today = new Date(2026, 9, 11) // 11 octobre 2026

  it('les N prochains mois, à partir d’aujourd’hui', () => {
    expect(searchWindow('3', true, today)).toEqual({ from: today, to: new Date(2027, 0, 1) })
    expect(searchWindow(null, false, today)).toEqual({ from: today, to: new Date(2027, 3, 1) })
  })

  it('un mois précis (?quand=2026-12) : du 1er au 1er du mois suivant', () => {
    expect(searchWindow('2026-12', true, today)).toEqual({
      from: new Date(2026, 11, 1),
      to: new Date(2027, 0, 1),
    })
  })

  it('le mois en cours commence aujourd’hui, pas le 1er', () => {
    expect(searchWindow('2026-10', true, today)).toEqual({
      from: today,
      to: new Date(2026, 10, 1),
    })
  })

  it('en gratuit, un mois au-delà des 6 mois est vide', () => {
    const window = searchWindow('2027-06', false, today)
    expect(window.to <= window.from).toBe(true)
  })
})

describe('beyondWindow', () => {
  const today = new Date(2026, 9, 11)

  it('sans mois précis : de l’horizon gratuit à douze mois', () => {
    expect(beyondWindow(null, today)).toEqual({
      from: new Date(2027, 3, 1),
      to: new Date(2027, 9, 1),
    })
  })

  it('un mois au-delà des 6 mois : ce mois entier', () => {
    expect(beyondWindow('2027-06', today)).toEqual({
      from: new Date(2027, 5, 1),
      to: new Date(2027, 6, 1),
    })
  })

  it('un mois avant l’horizon : rien de caché', () => {
    expect(beyondWindow('2026-12', today)).toBeNull()
  })
})

describe('quandChoices avec un mois précis', () => {
  it('le mois demandé s’ajoute en tête, nommé', () => {
    const [first] = quandChoices(true, '2026-12')
    expect(first).toEqual({ value: '2026-12', label: 'Décembre 2026', months: 1 })
  })
})
