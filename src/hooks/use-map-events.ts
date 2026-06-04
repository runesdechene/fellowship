import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { EventForMap, ParticipationLite } from '@/lib/map-data'

export function useMapEvents() {
  const { currentActor } = useAuth()
  const [events, setEvents] = useState<EventForMap[]>([])
  const [parts, setParts] = useState<ParticipationLite[]>([])
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarLabel, setAvatarLabel] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      const { data: rows, error: e1 } = await supabase
        .from('events')
        .select('id, slug, name, city, department, start_date, end_date, created_at, tags, image_url, latitude, longitude')
        .not('latitude', 'is', null)
      if (e1) {
        if (!cancelled) { setError(e1.message); setLoading(false) }
        return
      }
      if (currentActor) {
        const { data: p } = await supabase
          .from('participations')
          .select('event_id, status')
          .eq('actor_id', currentActor.id)
        const { data: pub } = await supabase
          .from('actor_public')
          .select('avatar_url, label')
          .eq('actor_id', currentActor.id)
          .maybeSingle()
        if (!cancelled) {
          setParts((p ?? []) as ParticipationLite[])
          setAvatarUrl(pub?.avatar_url ?? null)
          setAvatarLabel(pub?.label ?? currentActor.label ?? '')
        }
      }
      if (cancelled) return
      setEvents((rows ?? []) as EventForMap[])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [currentActor])

  return { events, parts, avatarUrl, avatarLabel, loading, error }
}
