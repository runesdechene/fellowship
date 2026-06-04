import { getTagLandingColor } from '@/components/ui/TagBadge'

export type EventForMap = {
  id: string
  slug: string | null
  name: string
  city: string
  department: string
  start_date: string
  end_date: string
  created_at: string
  tags: string[] | null
  image_url: string | null
  latitude: number | null
  longitude: number | null
}

export type ParticipationLite = { event_id: string; status: string }

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

// Convertit des events (déjà filtrés) en FeatureCollection pour la carte.
// `accepted` = l'acteur actif a une participation 'confirme' sur cet event.
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
