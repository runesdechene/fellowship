/**
 * QUOI     — les tests de lib/explorer.ts : le titre des résultats, le motif de recherche, la
 *            fenêtre « Quand ».
 * POURQUOI — une recherche mal échappée casse la requête ; un titre mal accordé se voit en haut
 *            de l'écran.
 */
import { describe, expect, it } from 'vitest'
import {
  FREE_MONTHS,
  GUEST_MONTHS,
  QUAND_OPTIONS,
  beyondTitle,
  publicTitle,
  lastOpenMonth,
  quandChoices,
  quandMonths,
  readRayon,
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
    expect(quandChoices(null).map((option) => option.months)).toEqual([12, 3, 1])
  })
  it('le gratuit fouille ses 6 prochains mois au plus', () => {
    expect(quandChoices(FREE_MONTHS).map((option) => option.months)).toEqual([6, 3, 1])
    expect(quandChoices(FREE_MONTHS)[0]?.label).toBe('Les 6 prochains mois')
  })
  it('sans compte, 3 mois au plus', () => {
    expect(quandChoices(GUEST_MONTHS)).toEqual([
      { value: '3', label: 'Les 3 prochains mois', months: 3 },
      { value: '1', label: 'Ce mois-ci', months: 1 },
    ])
  })
})

describe('windowMonths', () => {
  it('en gratuit, une adresse qui demande 12 mois est ramenée à 6', () => {
    expect(windowMonths('12', FREE_MONTHS)).toBe(6)
    expect(windowMonths(null, FREE_MONTHS)).toBe(6)
  })
  it('en gratuit, 3 mois restent 3 mois', () => {
    expect(windowMonths('3', FREE_MONTHS)).toBe(3)
  })
  it('en Pro, 12 mois par défaut', () => {
    expect(windowMonths(null, null)).toBe(12)
  })
  it('sans compte, jamais plus de 3 mois', () => {
    expect(windowMonths(null, GUEST_MONTHS)).toBe(3)
    expect(windowMonths('12', GUEST_MONTHS)).toBe(3)
    expect(windowMonths('1', GUEST_MONTHS)).toBe(1)
  })
})

describe('searchWindow', () => {
  const today = new Date(2026, 9, 11) // 11 octobre 2026

  it('les N prochains mois, à partir d’aujourd’hui', () => {
    expect(searchWindow('3', null, today)).toEqual({ from: today, to: new Date(2027, 0, 1) })
    expect(searchWindow(null, FREE_MONTHS, today)).toEqual({
      from: today,
      to: new Date(2027, 3, 1),
    })
  })

  it('sans compte, les 3 prochains mois', () => {
    expect(searchWindow(null, GUEST_MONTHS, today)).toEqual({
      from: today,
      to: new Date(2027, 0, 1),
    })
  })

  it('un mois précis (?quand=2026-12) : du 1er au 1er du mois suivant', () => {
    expect(searchWindow('2026-12', null, today)).toEqual({
      from: new Date(2026, 11, 1),
      to: new Date(2027, 0, 1),
    })
  })

  it('le mois en cours commence aujourd’hui, pas le 1er', () => {
    expect(searchWindow('2026-10', null, today)).toEqual({
      from: today,
      to: new Date(2026, 10, 1),
    })
  })

  it('en gratuit, un mois au-delà des 6 mois est vide', () => {
    const window = searchWindow('2027-06', FREE_MONTHS, today)
    expect(window.to <= window.from).toBe(true)
  })
})

describe('beyondWindow', () => {
  const today = new Date(2026, 9, 11)

  it('sans mois précis : de l’horizon gratuit à douze mois', () => {
    expect(beyondWindow(null, today, FREE_MONTHS)).toEqual({
      from: new Date(2027, 3, 1),
      to: new Date(2027, 9, 1),
    })
  })

  it('un mois au-delà des 6 mois : ce mois entier', () => {
    expect(beyondWindow('2027-06', today, FREE_MONTHS)).toEqual({
      from: new Date(2027, 5, 1),
      to: new Date(2027, 6, 1),
    })
  })

  it('sans compte : de janvier à douze mois', () => {
    expect(beyondWindow(null, today, GUEST_MONTHS)).toEqual({
      from: new Date(2027, 0, 1),
      to: new Date(2027, 9, 1),
    })
  })

  it('un mois avant l’horizon : rien de caché', () => {
    expect(beyondWindow('2026-12', today, FREE_MONTHS)).toBeNull()
  })
})

describe('quandChoices avec un mois précis', () => {
  it('le mois demandé s’ajoute en tête, nommé', () => {
    const [first] = quandChoices(null, '2026-12')
    expect(first).toEqual({ value: '2026-12', label: 'Décembre 2026', months: 1 })
  })
})

describe('lastOpenMonth', () => {
  const today = new Date(2026, 9, 11)
  it('le dernier mois fouillé : décembre sans compte, mars en gratuit', () => {
    expect(lastOpenMonth(today, GUEST_MONTHS)).toEqual(new Date(2026, 11, 1))
    expect(lastOpenMonth(today, FREE_MONTHS)).toEqual(new Date(2027, 2, 1))
  })
})

describe('publicTitle', () => {
  it('sans mots : le nombre et la fenêtre', () => {
    expect(publicTitle(16, '', 3)).toBe('16 festivals dans les 3 prochains mois.')
    expect(publicTitle(1, '', 3)).toBe('1 festival dans les 3 prochains mois.')
    expect(publicTitle(4, '', 1)).toBe('4 festivals ce mois-ci.')
    expect(publicTitle(0, '', 3)).toBe('Aucun festival dans les 3 prochains mois.')
  })
  it('avec des mots : le titre des résultats', () => {
    expect(publicTitle(2, 'Lyon', 3)).toBe('2 résultats pour « Lyon ».')
    expect(publicTitle(0, 'zzz', 3)).toBe('Aucun résultat pour « zzz ».')
  })
})

describe('beyondTitle', () => {
  it('accorde et nomme le mois', () => {
    expect(beyondTitle(13, new Date(2026, 11, 1))).toBe(
      '13 festivals de plus t’attendent après décembre.',
    )
    expect(beyondTitle(1, new Date(2026, 11, 1))).toBe(
      '1 festival de plus t’attend après décembre.',
    )
  })
})

describe('readRayon', () => {
  it('lit un rayon de la frise, refuse le reste', () => {
    expect(readRayon('50')).toBe(50)
    expect(readRayon('500')).toBe(500)
    expect(readRayon(null)).toBeNull()
    expect(readRayon('')).toBeNull()
    expect(readRayon('0')).toBeNull()
    expect(readRayon('501')).toBeNull()
    expect(readRayon('12.5')).toBeNull()
  })
})
