import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { Participation, ParticipationInsert, ParticipationWithEvent } from '@/types/database'

export function useMyParticipations(year?: number) {
  const { user } = useAuth()
  const [participations, setParticipations] = useState<ParticipationWithEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchParticipations()
  }, [user, year])

  async function fetchParticipations() {
    if (!user) return
    setLoading(true)

    const { data } = await supabase
      .from('participations')
      .select('*, events(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    setParticipations((data as ParticipationWithEvent[] | null) ?? [])
    setLoading(false)
  }

  return { participations, loading, refetch: fetchParticipations }
}

export function useFriendsParticipations() {
  const { user } = useAuth()
  const [participations, setParticipations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchFriendsParticipations()
  }, [user])

  async function fetchFriendsParticipations() {
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

    setParticipations(data ?? [])
    setLoading(false)
  }

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
