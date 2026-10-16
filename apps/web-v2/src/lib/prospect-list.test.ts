/**
 * QUOI     — tests de lib/prospect-list.ts : l'état de la liste des prospects dans l'adresse.
 * POURQUOI — l'adresse fait foi (règle V2) : un filtre inconnu ou une page fausse ne cassent rien.
 */
import { describe, expect, it } from 'vitest'
import { readProspectsQuery, writeProspectsQuery } from './prospect-list'

describe('readProspectsQuery', () => {
  it('par défaut : tous, aucune source, page 0', () => {
    expect(readProspectsQuery(new URLSearchParams(''))).toEqual({
      q: '',
      filter: 'tous',
      source: '',
      suivi: '',
      page: 0,
    })
  })
  it('lit recherche, filtre, source et page', () => {
    expect(
      readProspectsQuery(
        new URLSearchParams('q=%20forge%20&filtre=a_relancer&source=Salon%20de%20Rennes&page=2'),
      ),
    ).toEqual({
      q: 'forge',
      filter: 'a_relancer',
      source: 'Salon de Rennes',
      suivi: '',
      page: 2,
    })
  })
  it('un filtre inconnu retombe sur tous, une page fausse sur 0', () => {
    const query = readProspectsQuery(new URLSearchParams('filtre=admins&page=-1'))
    expect(query.filter).toBe('tous')
    expect(query.page).toBe(0)
  })
})

describe('writeProspectsQuery', () => {
  it('n’écrit que ce qui s’écarte du défaut', () => {
    expect(
      writeProspectsQuery({ q: '', filter: 'tous', source: '', suivi: '', page: 0 }).toString(),
    ).toBe('')
    expect(
      writeProspectsQuery({
        q: 'léa',
        filter: 'repondu',
        source: 'Instagram',
        suivi: '',
        page: 1,
      }).toString(),
    ).toBe('q=l%C3%A9a&filtre=repondu&source=Instagram&page=1')
  })
})

describe('suivi', () => {
  it('lit et écrit le suivi', () => {
    expect(readProspectsQuery(new URLSearchParams('suivi=moi')).suivi).toBe('moi')
    expect(
      writeProspectsQuery({ q: '', filter: 'tous', source: '', suivi: 'moi', page: 0 }).toString(),
    ).toBe('suivi=moi')
  })
})
