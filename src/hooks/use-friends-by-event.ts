import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { FriendAvatar } from '@/lib/map-data'

/**
 * Charge EN LOT, par event, les amis (RPC get_friend_ids — même source que le dock du
 * slideshow) qui ont une participation, avec leur avatar. Activé seulement en mode grille
 * (`enabled`) pour ne pas tirer le graphe social en mode slideshow (le dock a son propre fetch).
 * Retourne `Record<event_id, FriendAvatar[]>`.
 */
export function useFriendsByEvent(enabled: boolean): Record<string, FriendAvatar[]> {
  const { currentActor } = useAuth()
  const [byEvent, setByEvent] = useState<Record<string, FriendAvatar[]>>({})

  useEffect(() => {
    if (!enabled || !currentActor) { setByEvent({}); return }
    let cancelled = false
    const me = currentActor.id
    async function run() {
      const { data: friendIds } = await supabase.rpc('get_friend_ids', { p_user_id: me })
      const ids = (friendIds ?? []) as string[]
      if (ids.length === 0) { if (!cancelled) setByEvent({}); return }

      const [partRes, pubRes] = await Promise.all([
        supabase.from('participations').select('actor_id, event_id').in('actor_id', ids),
        supabase.from('actor_public').select('actor_id, label, avatar_url').in('actor_id', ids),
      ])

      const avatars = new Map<string, FriendAvatar>()
      for (const a of pubRes.data ?? []) {
        if (a.actor_id) avatars.set(a.actor_id, { avatarUrl: a.avatar_url, label: a.label ?? '—' })
      }
      const out: Record<string, FriendAvatar[]> = {}
      const seen = new Set<string>() // un ami compté une seule fois par event
      for (const p of (partRes.data ?? []) as Array<{ actor_id: string | null; event_id: string }>) {
        if (!p.actor_id) continue
        const key = `${p.event_id}|${p.actor_id}`
        if (seen.has(key)) continue
        seen.add(key)
        const av = avatars.get(p.actor_id)
        if (!av) continue
        ;(out[p.event_id] ??= []).push(av)
      }
      if (!cancelled) setByEvent(out)
    }
    run()
    return () => { cancelled = true }
  }, [enabled, currentActor])

  return byEvent
}
