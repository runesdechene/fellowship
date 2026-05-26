import { describe, it, expect } from 'vitest'
import { splitSeason, type SeasonEvent, linkHost, linkTypeIcon } from './vitrine'

const ev = (id: string, start: string): SeasonEvent =>
  ({ id, name: id, start_date: start, end_date: start, city: 'X', department: '01', tags: null, image_url: null })

describe('splitSeason', () => {
  const now = new Date('2026-06-15')
  it('sépare à venir / passés et trie', () => {
    const evs = [ev('a', '2026-09-05'), ev('b', '2026-01-10'), ev('c', '2026-07-01'), ev('d', '2026-03-02')]
    const { upcoming, past } = splitSeason(evs, now)
    expect(upcoming.map(e => e.id)).toEqual(['c', 'a'])
    expect(past.map(e => e.id)).toEqual(['d', 'b'])
  })
  it('listes vides si rien', () => {
    expect(splitSeason([], now)).toEqual({ upcoming: [], past: [] })
  })
})

describe('linkHost', () => {
  it("extrait l'hôte sans www", () => {
    expect(linkHost('https://www.terresetflammes.fr/boutique')).toBe('terresetflammes.fr')
  })
  it('renvoie la chaîne brute si URL invalide', () => {
    expect(linkHost('pas une url')).toBe('pas une url')
  })
})

describe('linkTypeIcon', () => {
  it('mappe les types connus', () => {
    expect(linkTypeIcon('instagram')).toBe('Instagram')
    expect(linkTypeIcon('shop')).toBe('ShoppingBag')
    expect(linkTypeIcon('website')).toBe('Globe')
  })
  it('type inconnu → Link', () => {
    expect(linkTypeIcon('other')).toBe('Link')
  })
})
