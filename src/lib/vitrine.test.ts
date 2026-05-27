import { describe, it, expect } from 'vitest'
import { splitSeason, type SeasonEvent, linkHost, linkTypeIcon, eventDurationDays, firstSeasonYear, companionsByEvent } from './vitrine'

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

describe('eventDurationDays', () => {
  it('compte les jours inclus (3 jours pour 12→14)', () => {
    expect(eventDurationDays('2026-06-12', '2026-06-14')).toBe(3)
  })
  it('1 jour si début = fin', () => {
    expect(eventDurationDays('2026-07-03', '2026-07-03')).toBe(1)
  })
  it('1 jour si fin manquante', () => {
    expect(eventDurationDays('2026-07-03', null)).toBe(1)
  })
})

describe('firstSeasonYear', () => {
  it('renvoie la plus petite année de début', () => {
    expect(firstSeasonYear([ev('a', '2024-05-01'), ev('b', '2023-09-01'), ev('c', '2025-01-01')])).toBe(2023)
  })
  it('null si vide', () => {
    expect(firstSeasonYear([])).toBeNull()
  })
})

describe('companionsByEvent', () => {
  it('regroupe les compagnons par event_id', () => {
    const rows = [
      { event_id: 'e1', actor_id: 'a', label: 'A', avatar_url: null, public_slug: 'a' },
      { event_id: 'e1', actor_id: 'b', label: 'B', avatar_url: null, public_slug: 'b' },
      { event_id: 'e2', actor_id: 'a', label: 'A', avatar_url: null, public_slug: 'a' },
    ]
    const map = companionsByEvent(rows)
    expect(map.get('e1')!.map(m => m.actor_id)).toEqual(['a', 'b'])
    expect(map.get('e2')!.length).toBe(1)
    expect(map.get('e3')).toBeUndefined()
  })
})
