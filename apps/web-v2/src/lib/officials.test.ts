/**
 * QUOI     — l'ordre de la barre des sujets : les comptes officiels en tête.
 * POURQUOI — spec 2026-11-11-compte-officiel : les sujets de Fellowship passent toujours en premier.
 */
import { describe, expect, test } from 'vitest'
import { officialFirst } from './officials'

describe('officialFirst', () => {
  test('les sujets officiels passent en tête, dans leur ordre', () => {
    const items = ['a', 'f1', 'b', 'f2']
    expect(officialFirst(items, (x) => x, new Set(['f1', 'f2']))).toEqual(['f1', 'f2', 'a', 'b'])
  })

  test('sans officiel, rien ne bouge', () => {
    expect(officialFirst(['a', 'b'], (x) => x, new Set())).toEqual(['a', 'b'])
  })
})
