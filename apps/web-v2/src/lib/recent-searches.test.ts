/**
 * QUOI     — tests de la mémoire des recherches récentes.
 * POURQUOI — un doublon ou une liste sans fin rendraient « Récemment » inutile.
 */
import { describe, expect, test } from 'vitest'
import { MAX_RECENT, withRecent } from './recent-searches'

describe('withRecent', () => {
  test('la dernière en tête, sans doublon ni casse en double', () => {
    expect(withRecent(['viking', 'geek'], 'Geek')).toEqual(['Geek', 'viking'])
  })
  test('bornée, et rien pour une recherche vide', () => {
    const full = ['a', 'b', 'c', 'd', 'e']
    expect(withRecent(full, 'f')).toHaveLength(MAX_RECENT)
    expect(withRecent(full, '  ')).toEqual(full)
  })
})
