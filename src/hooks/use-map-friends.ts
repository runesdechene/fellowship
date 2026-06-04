import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { FriendAvatar } from '@/lib/map-data'

// Charge, pour chaque event à venir, les amis (acteurs que je suis) qui y participent + leurs
// avatars. Activé uniquement quand `enabled` (toggle « Mes amis » + Pro), pour ne pas tirer
// le graphe social inutilement. Même source que les « convergences » de la Communauté.
export function useMapFriends(enabled: boolean) {
  const { currentActor } = useAuth()
  const [friendsByEvent, setFriendsByEvent] = useState<Record<string, FriendAvatar[]>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled || !currentActor) {
      setFriendsByEvent({})
      return
    }
    let cancelled = false
    async function run() {
      setLoading(true)
      const me = currentActor!.id
      const today = new Date().toISOString().slice(0, 10)

      const { data: follows } = await supabase
        .from('follows').select('following_actor').eq('follower_actor', me)
      const ids = [...new Set((follows ?? []).map(f => f.following_actor).filter((x): x is string => !!x))]
      if (ids.length === 0) {
        if (!cancelled) { setFriendsByEvent({}); setLoading(false) }
        return
      }

      const [partRes, pubRes] = await Promise.all([
        supabase.from('participations')
          .select('actor_id, event_id, events!inner(start_date)')
          .in('actor_id', ids).gte('events.start_date', today).neq('status', 'refuse'),
        supabase.from('actor_public').select('actor_id, label, avatar_url').in('actor_id', ids),
      ])

      const avatars = new Map<string, FriendAvatar>()
      for (const a of pubRes.data ?? []) {
        if (a.actor_id) avatars.set(a.actor_id, { avatarUrl: a.avatar_url, label: a.label ?? '—' })
      }
      const byEvent: Record<string, FriendAvatar[]> = {}
      const seen = new Set<string>() // un ami compté une seule fois par event
      for (const p of (partRes.data ?? []) as Array<{ actor_id: string | null; event_id: string }>) {
        if (!p.actor_id) continue
        const key = `${p.event_id}|${p.actor_id}`
        if (seen.has(key)) continue
        seen.add(key)
        const av = avatars.get(p.actor_id)
        if (!av) continue
        ;(byEvent[p.event_id] ??= []).push(av)
      }
      if (!cancelled) { setFriendsByEvent(byEvent); setLoading(false) }
    }
    run()
    return () => { cancelled = true }
  }, [enabled, currentActor])

  return { friendsByEvent, loading }
}
