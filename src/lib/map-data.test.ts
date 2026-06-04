import { describe, it, expect } from 'vitest'
import { eventsToGeoJSON, type EventForMap } from './map-data'
import { getTagLandingColor } from '@/components/ui/TagBadge'

const ev = (over: Partial<EventForMap> = {}): EventForMap => ({
  id: 'e1', slug: 'fest-1', name: 'Médiévale de Paris', city: 'Paris', department: '75',
  start_date: '2026-07-01', end_date: '2026-07-02', created_at: '2026-01-01T00:00:00Z',
  tags: ['fete-medievale'], image_url: 'https://img/x.jpg', latitude: 48.85, longitude: 2.35, ...over,
})

describe('eventsToGeoJSON', () => {
  it('produit des Point en [lng, lat]', () => {
    const fc = eventsToGeoJSON([ev()], [])
    expect(fc.features).toHaveLength(1)
    expect(fc.features[0].geometry.coordinates).toEqual([2.35, 48.85])
  })
  it('color = couleur du tag primaire (tags[0]), imageUrl repris', () => {
    const fc = eventsToGeoJSON([ev({ tags: ['geek'], image_url: 'u.jpg' })], [])
    expect(fc.features[0].properties.color).toBe(getTagLandingColor('geek'))
    expect(fc.features[0].properties.imageUrl).toBe('u.jpg')
  })
  it("accepted=true seulement si participation 'confirme' sur cet event", () => {
    expect(eventsToGeoJSON([ev()], [{ event_id: 'e1', status: 'confirme' }]).features[0].properties.accepted).toBe(true)
  })
  it("accepted=false si statut 'interesse'", () => {
    expect(eventsToGeoJSON([ev()], [{ event_id: 'e1', status: 'interesse' }]).features[0].properties.accepted).toBe(false)
  })
  it('ignore les events sans coords', () => {
    expect(eventsToGeoJSON([ev({ latitude: null })], []).features).toHaveLength(0)
  })
})
