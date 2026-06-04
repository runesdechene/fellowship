import { describe, it, expect } from 'vitest'
import { eventsToGeoJSON, eventsInBounds, filterFeatures, filterByPeriod, type EventForMap } from './map-data'
import { getTagLandingColor } from '@/components/ui/TagBadge'

const ev = (over: Partial<EventForMap> = {}): EventForMap => ({
  id: 'e1', slug: 'fest-1', name: 'Médiévale de Paris', city: 'Paris',
  start_date: '2026-07-01', end_date: '2026-07-02',
  tags: ['fete-medievale'], image_url: 'https://img/x.jpg', latitude: 48.85, longitude: 2.35, ...over,
})

describe('eventsToGeoJSON', () => {
  it('produit des Point en [lng, lat]', () => {
    const fc = eventsToGeoJSON([ev()], [])
    expect(fc.features).toHaveLength(1)
    expect(fc.features[0].geometry.coordinates).toEqual([2.35, 48.85])
  })
  it('color = couleur du tag primaire, imageUrl repris', () => {
    const fc = eventsToGeoJSON([ev({ tags: ['geek'], image_url: 'u.jpg' })], [])
    expect(fc.features[0].properties.color).toBe(getTagLandingColor('geek'))
    expect(fc.features[0].properties.imageUrl).toBe('u.jpg')
  })
  it("accepted=true seulement si participation 'confirme' sur cet event", () => {
    const fc = eventsToGeoJSON([ev()], [{ event_id: 'e1', status: 'confirme' }])
    expect(fc.features[0].properties.accepted).toBe(true)
  })
  it("accepted=false si statut 'interesse'", () => {
    const fc = eventsToGeoJSON([ev()], [{ event_id: 'e1', status: 'interesse' }])
    expect(fc.features[0].properties.accepted).toBe(false)
  })
  it('ignore les events sans coords', () => {
    expect(eventsToGeoJSON([ev({ latitude: null })], []).features).toHaveLength(0)
  })
})

describe('eventsInBounds', () => {
  it('ne garde que les features dans la bbox', () => {
    const fc = eventsToGeoJSON([ev(), ev({ id: 'e2', longitude: 9.0, latitude: 45.0 })], [])
    const within = eventsInBounds(fc.features, { west: 2, south: 48, east: 3, north: 49 })
    expect(within.map(f => f.properties.id)).toEqual(['e1'])
  })
})

describe('filterFeatures', () => {
  const fc = eventsToGeoJSON([
    ev({ id: 'a', name: 'Médiévale de Provins', city: 'Provins', tags: ['fete-medievale'] }),
    ev({ id: 'b', name: 'Geek Con', city: 'Lyon', tags: ['geek'] }),
  ], [{ event_id: 'a', status: 'confirme' }])
  it('filtre par tag (primaire)', () => {
    expect(filterFeatures(fc.features, { tag: 'geek', query: '', mineOnly: false }).map(f => f.properties.id)).toEqual(['b'])
  })
  it('filtre par requête sur nom ou ville (insensible casse)', () => {
    expect(filterFeatures(fc.features, { tag: null, query: 'provins', mineOnly: false }).map(f => f.properties.id)).toEqual(['a'])
  })
  it('mineOnly → garde seulement les acceptés', () => {
    expect(filterFeatures(fc.features, { tag: null, query: '', mineOnly: true }).map(f => f.properties.id)).toEqual(['a'])
  })
  it('sans filtre, renvoie tout', () => {
    expect(filterFeatures(fc.features, { tag: null, query: '', mineOnly: false })).toHaveLength(2)
  })
})

describe('filterByPeriod', () => {
  const now = new Date('2026-07-10T12:00:00Z')
  const fc = eventsToGeoJSON([
    ev({ id: 'past', start_date: '2026-06-01' }),
    ev({ id: 'thismonth', start_date: '2026-07-20' }),
    ev({ id: 'later', start_date: '2026-09-01' }),
  ], [])
  it("'all' renvoie tout", () => {
    expect(filterByPeriod(fc.features, 'all', now)).toHaveLength(3)
  })
  it("'upcoming' garde ceux qui démarrent aujourd'hui ou après", () => {
    expect(filterByPeriod(fc.features, 'upcoming', now).map(f => f.properties.id).sort()).toEqual(['later', 'thismonth'])
  })
  it("'month' garde ceux du mois calendaire courant", () => {
    expect(filterByPeriod(fc.features, 'month', now).map(f => f.properties.id)).toEqual(['thismonth'])
  })
})
