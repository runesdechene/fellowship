import { getTagLandingColor } from '@/components/ui/TagBadge'

export type EventForMap = {
  id: string
  slug: string | null
  name: string
  city: string
  start_date: string
  end_date: string
  tags: string[] | null
  image_url: string | null
  latitude: number | null
  longitude: number | null
}

export type ParticipationLite = { event_id: string; status: string }
export type Bounds = { west: number; south: number; east: number; north: number }
export type Period = 'all' | 'upcoming' | 'month'

export type MapFeatureProps = {
  id: string
  slug: string | null
  name: string
  city: string
  startDate: string
  endDate: string
  primaryTag: string
  color: string
  imageUrl: string | null
  accepted: boolean
}

export type MapFeature = {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: MapFeatureProps
}

export type MapFeatureCollection = { type: 'FeatureCollection'; features: MapFeature[] }

export function eventsToGeoJSON(events: EventForMap[], parts: ParticipationLite[]): MapFeatureCollection {
  const acceptedIds = new Set(parts.filter(p => p.status === 'confirme').map(p => p.event_id))
  const features: MapFeature[] = []
  for (const e of events) {
    if (e.latitude == null || e.longitude == null) continue
    const primaryTag = e.tags?.[0] ?? ''
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [e.longitude, e.latitude] },
      properties: {
        id: e.id, slug: e.slug, name: e.name, city: e.city,
        startDate: e.start_date, endDate: e.end_date,
        primaryTag, color: getTagLandingColor(primaryTag), imageUrl: e.image_url, accepted: acceptedIds.has(e.id),
      },
    })
  }
  return { type: 'FeatureCollection', features }
}

export function eventsInBounds(features: MapFeature[], b: Bounds): MapFeature[] {
  return features.filter(f => {
    const [lng, lat] = f.geometry.coordinates
    return lng >= b.west && lng <= b.east && lat >= b.south && lat <= b.north
  })
}

// Filtre par catégorie, recherche texte, et "mes festivals" (acceptés).
export function filterFeatures(features: MapFeature[], opts: { tag: string | null; query: string; mineOnly: boolean }): MapFeature[] {
  const q = opts.query.trim().toLowerCase()
  return features.filter(f => {
    if (opts.mineOnly && !f.properties.accepted) return false
    if (opts.tag && f.properties.primaryTag !== opts.tag) return false
    if (q && !(`${f.properties.name} ${f.properties.city}`.toLowerCase().includes(q))) return false
    return true
  })
}

// Filtre par période, basé sur la date de DÉBUT de l'event. `now` injecté (testable).
export function filterByPeriod(features: MapFeature[], period: Period, now: Date): MapFeature[] {
  if (period === 'all') return features
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return features.filter(f => {
    const start = new Date(f.properties.startDate)
    if (period === 'upcoming') return start >= today
    // 'month' : commence dans le mois calendaire courant
    return start.getFullYear() === now.getFullYear() && start.getMonth() === now.getMonth()
  })
}
