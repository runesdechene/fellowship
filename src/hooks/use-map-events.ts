import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { eventsToGeoJSON, type EventForMap, type MapFeatureCollection, type ParticipationLite } from '@/lib/map-data'

const EMPTY: MapFeatureCollection = { type: 'FeatureCollection', features: [] }

export function useMapEvents() {
  const { currentActor } = useAuth()
  const [data, setData] = useState<MapFeatureCollection>(EMPTY)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarLabel, setAvatarLabel] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      const { data: events, error: e1 } = await supabase
        .from('events')
        .select('id, slug, name, city, start_date, end_date, tags, image_url, latitude, longitude')
        .not('latitude', 'is', null)
      if (e1) {
        if (!cancelled) { setError(e1.message); setLoading(false) }
        return
      }
      let parts: ParticipationLite[] = []
      if (currentActor) {
        const { data: p } = await supabase
          .from('participations')
          .select('event_id, status')
          .eq('actor_id', currentActor.id)
        parts = (p ?? []) as ParticipationLite[]
        const { data: pub } = await supabase
          .from('actor_public')
          .select('avatar_url, label')
          .eq('actor_id', currentActor.id)
          .maybeSingle()
        if (!cancelled) {
          setAvatarUrl(pub?.avatar_url ?? null)
          setAvatarLabel(pub?.label ?? currentActor.label ?? '')
        }
      }
      if (cancelled) return
      setData(eventsToGeoJSON((events ?? []) as EventForMap[], parts))
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [currentActor])

  return { data, avatarUrl, avatarLabel, loading, error }
}
