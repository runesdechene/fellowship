/**
 * QUOI     — tests de lib/admin-list.ts : l'état de la liste des comptes lu et écrit dans l'adresse.
 * POURQUOI — l'adresse fait foi (règle V2) : un filtre inconnu ou une page fausse ne cassent rien.
 */
import { describe, expect, it } from 'vitest'
import { filtersFor, readAccountsQuery, writeAccountsQuery } from './admin-list'

describe('readAccountsQuery', () => {
  it('par défaut : les enseignes, toutes, page 0', () => {
    expect(readAccountsQuery(new URLSearchParams(''))).toEqual({
      view: 'enseignes',
      q: '',
      filter: 'toutes',
      page: 0,
    })
  })
  it('lit la vue personnes et son filtre', () => {
    expect(
      readAccountsQuery(new URLSearchParams('vue=personnes&filtre=admins&q=%20lea%20&page=2')),
    ).toEqual({ view: 'personnes', q: 'lea', filter: 'admins', page: 2 })
  })
  it('un filtre d’une autre vue retombe sur le défaut', () => {
    expect(readAccountsQuery(new URLSearchParams('filtre=admins')).filter).toBe('toutes')
  })
  it('une page négative ou illisible vaut 0', () => {
    expect(readAccountsQuery(new URLSearchParams('page=-3')).page).toBe(0)
    expect(readAccountsQuery(new URLSearchParams('page=abc')).page).toBe(0)
  })
})

describe('writeAccountsQuery', () => {
  it('n’écrit que ce qui s’écarte du défaut', () => {
    expect(
      writeAccountsQuery({ view: 'enseignes', q: '', filter: 'toutes', page: 0 }).toString(),
    ).toBe('')
    expect(
      writeAccountsQuery({ view: 'personnes', q: 'léa', filter: 'pro', page: 1 }).toString(),
    ).toBe('vue=personnes&q=l%C3%A9a&filtre=pro&page=1')
  })
})

describe('filtersFor', () => {
  it('six filtres par vue, le défaut en tête', () => {
    expect(filtersFor('enseignes').map((f) => f.value)).toEqual([
      'toutes',
      'pro',
      'essai',
      'gratuit',
      'exposants',
      'festivals',
    ])
    expect(filtersFor('personnes').map((f) => f.value)).toEqual([
      'tous',
      'pro',
      'essai',
      'gratuit',
      'sans_enseigne',
      'admins',
    ])
  })
})
