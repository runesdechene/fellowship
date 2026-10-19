/**
 * QUOI     — tests de lib/admin-events.ts : recherche et page lues et écrites dans l'adresse.
 * POURQUOI — une page négative ou absente retombe sur la première.
 */
import { describe, expect, it } from 'vitest'
import { readEventsQuery, writeEventsQuery } from './admin-events'

describe('la liste des événements dans l’adresse', () => {
  it('lit la recherche et la page, et tombe sur la première page sinon', () => {
    expect(readEventsQuery(new URLSearchParams('q=%20fest%20&page=2'))).toEqual({
      q: 'fest',
      page: 2,
    })
    expect(readEventsQuery(new URLSearchParams('page=-3'))).toEqual({ q: '', page: 0 })
  })

  it('n’écrit que ce qui s’écarte du défaut', () => {
    expect(writeEventsQuery({ q: '', page: 0 }).toString()).toBe('')
    expect(writeEventsQuery({ q: 'fest', page: 1 }).toString()).toBe('q=fest&page=1')
  })
})
