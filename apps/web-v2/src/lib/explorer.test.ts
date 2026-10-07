/**
 * QUOI     — les tests de lib/explorer.ts : le titre des résultats, le motif de recherche, la
 *            fenêtre « Quand ».
 * POURQUOI — une recherche mal échappée casse la requête ; un titre mal accordé se voit en haut
 *            de l'écran.
 */
import { describe, expect, it } from 'vitest'
import { QUAND_OPTIONS, quandMonths, resultsTitle, searchPattern } from './explorer'

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
