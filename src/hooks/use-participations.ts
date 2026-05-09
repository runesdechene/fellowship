import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { Participation, ParticipationInsert, ParticipationWithEvent } from '@/types/database'

export function useMyParticipations(year?: number) {
  const { user } = useAuth()
  const [participations, setParticipations] = useState<ParticipationWithEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchParticipations = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)

    try {
      const { data } = await supabase
        .from('participations')
        .select('*, events(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setParticipations((data as ParticipationWithEvent[] | null) ?? [])
    } catch {
      setParticipations([])
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchParticipations()
  }, [user, year, fetchParticipations])
  // year in effect dep array triggers refetch when year changes

  return { participations, loading, refetch: fetchParticipations }
}

export type FriendParticipation = { id: string; event_id: string; user_id: string; status: string; events?: { name: string; [key: string]: unknown }; profiles?: { brand_name: string | null; display_name: string | null; avatar_url: string | null; public_slug: string | null; type: string | null } }

export function useFriendsParticipations() {
  const { user } = useAuth()
  const [participations, setParticipations] = useState<FriendParticipation[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFriendsParticipations = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const { data: friendRows } = await supabase.rpc('get_friend_ids', { p_user_id: user.id })
    const friendIds = friendRows as string[] | null

    if (!friendIds || friendIds.length === 0) {
      setParticipations([])
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('participations')
      .select('*, events(*), profiles(brand_name, display_name, avatar_url, public_slug, type)')
      .in('user_id', friendIds)
      .in('visibility', ['amis', 'public'])
      .order('created_at', { ascending: false })
      .limit(50)

    setParticipations((data as FriendParticipation[] | null) ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFriendsParticipations()
  }, [user, fetchFriendsParticipations])

  return { participations, loading, refetch: fetchFriendsParticipations }
}

export async function addParticipation(participation: ParticipationInsert) {
  const { data, error } = await supabase
    .from('participations')
    .insert(participation)
    .select()
    .single()
  return { data, error }
}

export async function updateParticipation(id: string, updates: Partial<Participation>) {
  const { data, error } = await supabase
    .from('participations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function removeParticipation(id: string) {
  const { error } = await supabase
    .from('participations')
    .delete()
    .eq('id', id)
  return { error }
}

export function useFriendsOnEvent(eventId: string | undefined) {
  const { user } = useAuth()
  const [friends, setFriends] = useState<{ id: string; display_name: string | null; brand_name: string | null; avatar_url: string | null; public_slug: string | null; status: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- early-exit synchronous reset, no async race
    if (!user || !eventId) { setLoading(false); return }
    const resolvedEventId = eventId

    async function fetch() {
      const { data: friendIds } = await supabase.rpc('get_friend_ids', { p_user_id: user!.id })
      if (!friendIds || (friendIds as string[]).length === 0) {
        setFriends([])
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('participations')
        .select('status, profiles(id, display_name, brand_name, avatar_url, public_slug)')
        .eq('event_id', resolvedEventId)
        .in('user_id', friendIds as string[])

      const result = (data ?? []).map((p: { status: string; profiles: { id: string; display_name: string | null; brand_name: string | null; avatar_url: string | null; public_slug: string | null } }) => ({
        ...p.profiles,
        status: p.status,
      }))

      setFriends(result)
      setLoading(false)
    }

    fetch()
  }, [user, eventId])

  return { friends, loading }
}
