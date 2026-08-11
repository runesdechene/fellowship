// src/lib/annuaire.test.ts
import { describe, it, expect } from 'vitest'
import { toPublicList, applicationStatus, formatWhen, searchEvents, countCounters } from './annuaire'
import type { PublicEvent } from './annuaire'

const TODAY = new Date('2026-08-11T00:00:00Z')

function ev(over: Partial<PublicEvent> = {}): PublicEvent {
  return {
    id: 'x', name: 'Fête médiévale', slug: 'fete-medievale-provins', city: 'Provins',
    department: '77', start_date: '2026-09-12', end_date: '2026-09-13',
    image_url: null, tags: ['fete-medievale'], registration_url: null,
    registration_deadline: null, is_private: false, ...over,
  }
}

describe('toPublicList', () => {
  it('exclut les événements privés', () => {
    const list = toPublicList([ev(), ev({ id: 'p', is_private: true })], TODAY)
    expect(list.map(e => e.id)).toEqual(['x'])
  })
  it('exclut ce qui est déjà terminé, garde ce qui est en cours', () => {
    const fini = ev({ id: 'fini', start_date: '2026-07-01', end_date: '2026-07-03' })
    const encours = ev({ id: 'encours', start_date: '2026-08-09', end_date: '2026-08-13' })
    expect(toPublicList([fini, encours], TODAY).map(e => e.id)).toEqual(['encours'])
  })
  it('trie par date de début croissante', () => {
    const tard = ev({ id: 'tard', start_date: '2026-12-01', end_date: '2026-12-02' })
    const tot = ev({ id: 'tot', start_date: '2026-08-20', end_date: '2026-08-21' })
    expect(toPublicList([tard, tot], TODAY).map(e => e.id)).toEqual(['tot', 'tard'])
  })
})

describe('applicationStatus', () => {
  it('sans lien ni date limite → info neutre', () => {
    expect(applicationStatus(ev(), TODAY)).toEqual({ kind: 'info', label: 'Voir la fiche' })
  })
  it('lien de candidature sans date limite → ouvertes', () => {
    expect(applicationStatus(ev({ registration_url: 'https://x.fr' }), TODAY))
      .toEqual({ kind: 'open', label: 'Candidatures ouvertes' })
  })
  it('date limite dans 9 jours → clôture imminente', () => {
    expect(applicationStatus(ev({ registration_deadline: '2026-08-20' }), TODAY))
      .toEqual({ kind: 'soon', label: 'Clôture dans 9 jours' })
  })
  it('date limite demain → singulier', () => {
    expect(applicationStatus(ev({ registration_deadline: '2026-08-12' }), TODAY))
      .toEqual({ kind: 'soon', label: 'Clôture dans 1 jour' })
  })
  it('date limite dépassée → candidatures closes', () => {
    expect(applicationStatus(ev({ registration_deadline: '2026-08-01', registration_url: 'https://x.fr' }), TODAY))
      .toEqual({ kind: 'info', label: 'Candidatures closes' })
  })
  it('date limite lointaine → ouvertes', () => {
    expect(applicationStatus(ev({ registration_deadline: '2026-11-01' }), TODAY))
      .toEqual({ kind: 'open', label: 'Candidatures ouvertes' })
  })
})

describe('formatWhen', () => {
  it('deux jours du même mois → « 12 – 13 septembre · Provins »', () => {
    expect(formatWhen(ev())).toBe('12 – 13 septembre · Provins')
  })
  it('à cheval sur deux mois → les deux mois sont nommés', () => {
    expect(formatWhen(ev({ start_date: '2026-10-30', end_date: '2026-11-02' })))
      .toBe('30 octobre – 2 novembre · Provins')
  })
  it('un seul jour → pas de tiret', () => {
    expect(formatWhen(ev({ start_date: '2026-09-12', end_date: '2026-09-12' })))
      .toBe('12 septembre · Provins')
  })
  it('sans ville → seulement les dates', () => {
    expect(formatWhen(ev({ city: null }))).toBe('12 – 13 septembre')
  })
})

describe('searchEvents', () => {
  const list = [ev(), ev({ id: 'n', name: 'Marché de Noël', city: 'Colmar' })]
  it('requête vide → tout', () => {
    expect(searchEvents(list, '  ')).toHaveLength(2)
  })
  it('cherche dans le nom, sans casse ni accents', () => {
    expect(searchEvents(list, 'MARCHE DE NOEL').map(e => e.id)).toEqual(['n'])
  })
  it('cherche dans la ville', () => {
    expect(searchEvents(list, 'provins').map(e => e.id)).toEqual(['x'])
  })
})

describe('countCounters', () => {
  it('compte les vrais nombres, jamais de chiffre inventé', () => {
    const list = [ev(), ev({ id: 'b', registration_url: 'https://x.fr' })]
    expect(countCounters(list, 84)).toEqual([
      { n: '2', label: 'événements à venir' },
      { n: '1', label: 'prend des exposants' },
      { n: '84', label: 'exposants inscrits' },
    ])
  })
  it('accorde le libellé au pluriel', () => {
    const list = [ev({ id: 'a', registration_url: 'https://x.fr' }), ev({ id: 'b', registration_url: 'https://y.fr' })]
    expect(countCounters(list, 2)[1]).toEqual({ n: '2', label: 'prennent des exposants' })
  })
  it('compte des exposants inconnu → la troisième pastille disparaît', () => {
    expect(countCounters([ev()], null)).toHaveLength(2)
  })
})
