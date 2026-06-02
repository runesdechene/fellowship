import { describe, it, expect } from 'vitest'
import {
  reviewStars, avatarColor, sortFeed, filterBySegment,
  rankConvergences, rankSuggestions,
  type FeedItem, type FeedActor, type FeedEventRef,
} from './community'

const ev = (id: string, start: string): FeedEventRef =>
  ({ id, name: id, city: 'X', startDate: start, endDate: start, imageUrl: null, slug: null })
const ac = (id: string): FeedActor => ({ actorId: id, label: id, avatarUrl: null, slug: id })

describe('reviewStars', () => {
  it('moyenne arrondie des 3 axes', () => {
    expect(reviewStars({ affluence: 5, organisation: 4, rentabilite: 5 })).toBe(5)
    expect(reviewStars({ affluence: 3, organisation: 3, rentabilite: 3 })).toBe(3)
    expect(reviewStars({ affluence: 2, organisation: 3, rentabilite: 2 })).toBe(2)
  })
})

describe('avatarColor', () => {
  it('déterministe pour un même nom', () => {
    expect(avatarColor('Théo')).toBe(avatarColor('Théo'))
  })
  it('renvoie une couleur de la palette', () => {
    expect(avatarColor('Camille')).toMatch(/^#/)
  })
})

describe('sortFeed', () => {
  it('trie par occurredAt décroissant', () => {
    const items = [
      { id: 'a', occurredAt: '2026-05-01T00:00:00Z' },
      { id: 'b', occurredAt: '2026-05-10T00:00:00Z' },
      { id: 'c', occurredAt: '2026-05-05T00:00:00Z' },
    ] as FeedItem[]
    expect(sortFeed(items).map(i => i.id)).toEqual(['b', 'c', 'a'])
  })
})

describe('filterBySegment', () => {
  const items = [
    { id: 'r', kind: 'review' },
    { id: 'p', kind: 'participation' },
    { id: 'f', kind: 'follow' },
  ] as FeedItem[]
  it('tout = tous', () => expect(filterBySegment(items, 'tout')).toHaveLength(3))
  it('avis = reviews', () => expect(filterBySegment(items, 'avis').map(i => i.id)).toEqual(['r']))
  it('ou-ils-vont = participations', () => expect(filterBySegment(items, 'ou-ils-vont').map(i => i.id)).toEqual(['p']))
  it('reseau = follows', () => expect(filterBySegment(items, 'reseau').map(i => i.id)).toEqual(['f']))
})

describe('rankConvergences', () => {
  it('garde les events avec ≥2 abonnements distincts, triés count desc puis date asc', () => {
    const parts = [
      { eventId: 'e1', actor: ac('a') },
      { eventId: 'e1', actor: ac('b') },
      { eventId: 'e1', actor: ac('a') },
      { eventId: 'e2', actor: ac('a') },
      { eventId: 'e3', actor: ac('a') },
      { eventId: 'e3', actor: ac('b') },
      { eventId: 'e3', actor: ac('c') },
    ]
    const events = { e1: ev('e1', '2026-09-20'), e2: ev('e2', '2026-09-01'), e3: ev('e3', '2026-10-01') }
    const res = rankConvergences(parts, events)
    expect(res.map(c => c.event.id)).toEqual(['e3', 'e1'])
    expect(res[0].count).toBe(3)
  })
  it('échantillonne au plus 5 avatars', () => {
    const parts = ['a', 'b', 'c', 'd', 'e', 'f'].map(a => ({ eventId: 'e1', actor: ac(a) }))
    const res = rankConvergences(parts, { e1: ev('e1', '2026-09-20') })
    expect(res[0].sample).toHaveLength(5)
    expect(res[0].count).toBe(6)
  })
})

describe('rankSuggestions', () => {
  it('classe par (2×abonnements communs + festivals communs) décroissant', () => {
    const res = rankSuggestions([
      { actor: ac('lucie'), sharedFollowers: 0, sharedEvents: 4 },
      { actor: ac('naim'),  sharedFollowers: 3, sharedEvents: 0 },
      { actor: ac('elise'), sharedFollowers: 1, sharedEvents: 1 },
    ])
    expect(res.map(s => s.actor.actorId)).toEqual(['naim', 'lucie', 'elise'])
  })
  it('compose une raison lisible', () => {
    const [s] = rankSuggestions([{ actor: ac('lucie'), sharedFollowers: 0, sharedEvents: 4 }])
    expect(s.reason).toContain('4')
  })
})
