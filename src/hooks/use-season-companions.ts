import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { companionsByEvent, type CompanionRow } from '@/lib/vitrine'

/** Map<eventId, compagnons du visiteur qui y vont>. Vide si non connecté. */
export function useSeasonCompanions(eventIds: string[]): Map<string, CompanionRow[]> {
  const { currentActor } = useAuth()
  const [map, setMap] = useState<Map<string, CompanionRow[]>>(new Map())
  const key = eventIds.slice().sort().join(',')

  useEffect(() => {
    if (!currentActor || eventIds.length === 0) { setMap(new Map()); return } // eslint-disable-line react-hooks/set-state-in-effect
    let cancelled = false
    async function run() {
      const { data: friendIds } = await supabase.rpc('get_friend_ids', { p_user_id: currentActor!.id })
      const ids = (friendIds as string[] | null) ?? []
      if (ids.length === 0) { if (!cancelled) setMap(new Map()); return }
      const { data: parts } = await supabase
        .from('participations')
        .select('event_id, actor_id, actor_public:actor_id(label, avatar_url, public_slug)')
        .in('event_id', eventIds).in('actor_id', ids).eq('status', 'inscrit')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows: CompanionRow[] = ((parts ?? []) as any[]).map(p => ({
        event_id: p.event_id, actor_id: p.actor_id,
        label: p.actor_public?.label ?? null, avatar_url: p.actor_public?.avatar_url ?? null, public_slug: p.actor_public?.public_slug ?? null,
      }))
      if (!cancelled) setMap(companionsByEvent(rows))
    }
    run()
    return () => { cancelled = true }
  }, [key, currentActor]) // eslint-disable-line react-hooks/exhaustive-deps

  return map
}
