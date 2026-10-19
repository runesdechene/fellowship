/**
 * QUOI     — tests des nouveaux abonnés de la cloche et des mots du réseau.
 * POURQUOI — la cloche ne doit montrer que les comptes non exposants de la semaine : un exposant
 *            y est une demande, pas un abonné.
 */
import { describe, expect, test } from 'vitest'
import {
  kindLabel,
  newcomersPhrase,
  newFollowers,
  peopleCount,
  requestsLabel,
  type Member,
} from './network'

const NOW = new Date('2026-10-19T12:00:00Z')

function member(kind: Member['kind'], since: string): Member {
  return { id: `${kind}-${since}`, name: kind, avatarUrl: null, slug: null, kind, since }
}

describe('les nouveaux abonnés', () => {
  test('ne gardent que les non-exposants de la semaine', () => {
    const fresh = member('personne', '2026-10-18T09:00:00Z')
    const festival = member('festival', '2026-10-15T09:00:00Z')
    const followers = [
      fresh,
      festival,
      member('exposant', '2026-10-18T09:00:00Z'),
      member('personne', '2026-10-10T09:00:00Z'),
    ]
    expect(newFollowers(followers, NOW)).toEqual([fresh, festival])
  })
})

describe('le réseau en mots', () => {
  test('nomme les nouveaux abonnés', () => {
    expect(newcomersPhrase(['Mathéo'])).toBe('Mathéo suit ta vitrine')
    expect(newcomersPhrase(['Mathéo', 'Nolroc'])).toBe('Mathéo et Nolroc suivent ta vitrine')
    expect(newcomersPhrase(['Mathéo', 'Nolroc', 'Léa'])).toBe(
      'Mathéo, Nolroc et 1 autre suivent ta vitrine',
    )
  })

  test('accorde amis et abonnés', () => {
    expect(peopleCount(0, 'ami')).toBe('0 amis')
    expect(peopleCount(1, 'abonné')).toBe('1 abonné')
    expect(peopleCount(12, 'abonné')).toBe('12 abonnés')
  })

  test('compte les demandes en attente', () => {
    expect(requestsLabel(1)).toBe('1 demande d’ami en attente')
    expect(requestsLabel(3)).toBe('3 demandes d’ami en attente')
  })

  test('nomme le genre de compte', () => {
    expect(kindLabel('personne')).toBe('Festivalier')
    expect(kindLabel('exposant')).toBe('Exposant')
  })
})
