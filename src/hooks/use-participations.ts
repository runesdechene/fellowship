import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { Participation, ParticipationInsert, ParticipationWithEvent } from '@/types/database'

export function useMyParticipations(year?: number) {
  const { user } = useAuth()
  const [participations, setParticipations] = useState<ParticipationWithEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchParticipations = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const { data } = await supabase
      .from('participations')
      .select('*, events(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    setParticipations((data as ParticipationWithEvent[] | null) ?? [])
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

export type FriendParticipation = { id: string; event_id: string; user_id: string; events?: { name: string; [key: string]: unknown }; profiles?: { display_name: string | null; avatar_url: string | null } }

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
      .select('*, events(*), profiles(display_name, avatar_url)')
      .in('user_id', friendIds)
      .in('visibility', ['amis', 'public'])
      .order('created_at', { ascending: false })
      .limit(20)

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
