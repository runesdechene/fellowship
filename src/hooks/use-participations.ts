import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { Participation, ParticipationInsert, ParticipationWithEvent } from '@/types/database'

export function useMyParticipations(year?: number) {
  const { currentActor } = useAuth()
  const [participations, setParticipations] = useState<ParticipationWithEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchParticipations = useCallback(async () => {
    if (!currentActor) { setLoading(false); return }
    setLoading(true)
    try {
      const { data } = await supabase
        .from('participations')
        .select('*, events(*)')
        .eq('actor_id', currentActor.id)
        .order('created_at', { ascending: false })
      setParticipations((data as ParticipationWithEvent[] | null) ?? [])
    } catch { setParticipations([]) }
    setLoading(false)
  }, [currentActor])

  useEffect(() => {
    if (!currentActor) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchParticipations()
  }, [currentActor, year, fetchParticipations])

  return { participations, loading, refetch: fetchParticipations }
}

// actor_public is a VIEW — PostgREST cannot infer a FK relationship from participations to actor_public.
// Fallback: fetch participations, then fetch actor_public rows by actor_id in a second query and merge in JS.
export type FriendParticipation = {
  id: string
  event_id: string
  actor_id: string
  status: string
  events?: { name: string; [key: string]: unknown }
  actor_public?: {
    label: string | null
    avatar_url: string | null
    public_slug: string | null
    entity_type: string | null
    kind: string
  }
}

export function useFriendsParticipations() {
  const { currentActor } = useAuth()
  const [participations, setParticipations] = useState<FriendParticipation[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFriendsParticipations = useCallback(async () => {
    if (!currentActor) return
    setLoading(true)
    const { data: friendRows } = await supabase.rpc('get_friend_ids', { p_user_id: currentActor.id })
    const friendIds = friendRows as string[] | null
    if (!friendIds || friendIds.length === 0) { setParticipations([]); setLoading(false); return }

    const { data: parts } = await supabase
      .from('participations')
      .select('*, events(*)')
      .in('actor_id', friendIds)
      .in('visibility', ['amis', 'public'])
      .order('created_at', { ascending: false })
      .limit(50)

    const rows = (parts ?? []) as Array<{ id: string; event_id: string; actor_id: string; status: string; events?: { name: string; [key: string]: unknown } }>
    const actorIds = [...new Set(rows.map(r => r.actor_id))]

    const actorMap: Record<string, { label: string | null; avatar_url: string | null; public_slug: string | null; entity_type: string | null; kind: string }> = {}
    if (actorIds.length > 0) {
      const { data: actors } = await supabase
        .from('actor_public')
        .select('actor_id, label, avatar_url, public_slug, entity_type, kind')
        .in('actor_id', actorIds)
      for (const a of (actors ?? [])) {
        if (a.actor_id) actorMap[a.actor_id] = { label: a.label, avatar_url: a.avatar_url, public_slug: a.public_slug, entity_type: a.entity_type, kind: a.kind ?? 'person' }
      }
    }

    setParticipations(rows.map(r => ({ ...r, actor_public: actorMap[r.actor_id] })))
    setLoading(false)
  }, [currentActor])

  useEffect(() => {
    if (!currentActor) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFriendsParticipations()
  }, [currentActor, fetchFriendsParticipations])

  return { participations, loading, refetch: fetchFriendsParticipations }
}

export async function addParticipation(participation: ParticipationInsert) {
  const { data, error } = await supabase.from('participations').insert(participation).select().single()
  return { data, error }
}

export async function updateParticipation(id: string, updates: Partial<Participation>) {
  const { data, error } = await supabase.from('participations').update(updates).eq('id', id).select().single()
  return { data, error }
}

export async function removeParticipation(id: string) {
  const { error } = await supabase.from('participations').delete().eq('id', id)
  return { error }
}

export function useFriendsOnEvent(eventId: string | undefined) {
  const { currentActor } = useAuth()
  const [friends, setFriends] = useState<{ actor_id: string; label: string | null; avatar_url: string | null; public_slug: string | null; status: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- early-exit synchronous reset
    if (!currentActor || !eventId) { setLoading(false); return }
    const resolvedEventId = eventId
    async function fetch() {
      const { data: friendIds } = await supabase.rpc('get_friend_ids', { p_user_id: currentActor!.id })
      if (!friendIds || (friendIds as string[]).length === 0) { setFriends([]); setLoading(false); return }

      const { data: parts } = await supabase
        .from('participations')
        .select('actor_id, status')
        .eq('event_id', resolvedEventId)
        .in('actor_id', friendIds as string[])

      const rows = (parts ?? []) as Array<{ actor_id: string; status: string }>
      const actorIds = rows.map(r => r.actor_id)

      if (actorIds.length === 0) { setFriends([]); setLoading(false); return }

      const { data: actors } = await supabase
        .from('actor_public')
        .select('actor_id, label, avatar_url, public_slug')
        .in('actor_id', actorIds)

      const actorMap: Record<string, { label: string | null; avatar_url: string | null; public_slug: string | null }> = {}
      for (const a of (actors ?? [])) {
        if (a.actor_id) actorMap[a.actor_id] = { label: a.label, avatar_url: a.avatar_url, public_slug: a.public_slug }
      }

      setFriends(rows.map(r => ({ actor_id: r.actor_id, status: r.status, ...actorMap[r.actor_id] ?? { label: null, avatar_url: null, public_slug: null } })))
      setLoading(false)
    }
    fetch()
  }, [currentActor, eventId])

  return { friends, loading }
}
