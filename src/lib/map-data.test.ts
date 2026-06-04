import { describe, it, expect } from 'vitest'
import { eventsToGeoJSON, eventsInBounds, filterFeatures, type EventForMap } from './map-data'
import { getTagLandingColor } from '@/components/ui/TagBadge'

const ev = (over: Partial<EventForMap> = {}): EventForMap => ({
  id: 'e1', slug: 'fest-1', name: 'Médiévale de Paris', city: 'Paris',
  start_date: '2026-07-01', end_date: '2026-07-02',
  tags: ['fete-medievale'], latitude: 48.85, longitude: 2.35, ...over,
})

describe('eventsToGeoJSON', () => {
  it('produit des Point en [lng, lat]', () => {
    const fc = eventsToGeoJSON([ev()], [])
    expect(fc.features).toHaveLength(1)
    expect(fc.features[0].geometry.coordinates).toEqual([2.35, 48.85])
  })
  it('color = couleur du tag primaire (tags[0])', () => {
    const fc = eventsToGeoJSON([ev({ tags: ['geek'] })], [])
    expect(fc.features[0].properties.color).toBe(getTagLandingColor('geek'))
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
  ], [])
  it('filtre par tag (primaire)', () => {
    expect(filterFeatures(fc.features, { tag: 'geek', query: '' }).map(f => f.properties.id)).toEqual(['b'])
  })
  it('filtre par requête sur nom ou ville (insensible casse)', () => {
    expect(filterFeatures(fc.features, { tag: null, query: 'provins' }).map(f => f.properties.id)).toEqual(['a'])
  })
  it('sans filtre, renvoie tout', () => {
    expect(filterFeatures(fc.features, { tag: null, query: '' })).toHaveLength(2)
  })
})
