import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

export type PublicActor = {
  actor_id: string
  kind: 'person' | 'entity'
  label: string | null
  avatar_url: string | null
  entity_type: string | null
  public_slug: string | null
}

export function useFollowStatus(targetId: string | undefined) {
  const { currentActor } = useAuth()
  const me = currentActor?.id
  const [isFollowing, setIsFollowing] = useState(false)
  const [isFriend, setIsFriend] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!me || !targetId || me === targetId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
      return
    }

    async function check() {
      const { data: myFollow } = await supabase
        .from('follows').select('id')
        .eq('follower_actor', me!).eq('following_actor', targetId!).maybeSingle()
      const { data: theirFollow } = await supabase
        .from('follows').select('id')
        .eq('follower_actor', targetId!).eq('following_actor', me!).maybeSingle()
      setIsFollowing(!!myFollow)
      setIsFriend(!!myFollow && !!theirFollow)
      setLoading(false)
    }
    check()
  }, [me, targetId])

  const toggleFollow = async () => {
    if (!me || !targetId) return
    if (isFollowing) {
      await supabase.from('follows').delete()
        .eq('follower_actor', me).eq('following_actor', targetId)
      setIsFollowing(false)
      setIsFriend(false)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('follows') as any).insert({ follower_actor: me, following_actor: targetId })
      setIsFollowing(true)
      const { data: theirFollow } = await supabase
        .from('follows').select('id')
        .eq('follower_actor', targetId).eq('following_actor', me).maybeSingle()
      setIsFriend(!!theirFollow)
    }
  }

  return { isFollowing, isFriend, loading, toggleFollow }
}

export function useMyFriends() {
  const { currentActor } = useAuth()
  const [friends, setFriends] = useState<PublicActor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentActor) { setLoading(false); return } // eslint-disable-line react-hooks/set-state-in-effect
    async function fetchFriends() {
      try {
        const { data: friendRows } = await supabase.rpc('get_friend_ids', { p_user_id: currentActor!.id })
        const friendIds = friendRows as string[] | null
        if (!friendIds || friendIds.length === 0) { setFriends([]); setLoading(false); return }
        const { data } = await supabase.from('actor_public').select('*').in('actor_id', friendIds)
        setFriends((data as PublicActor[] | null) ?? [])
      } catch { setFriends([]) }
      setLoading(false)
    }
    fetchFriends()
  }, [currentActor])

  return { friends, loading }
}

export function useMyFollowers() {
  const { currentActor } = useAuth()
  const [followers, setFollowers] = useState<PublicActor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentActor) { setLoading(false); return } // eslint-disable-line react-hooks/set-state-in-effect
    async function fetchFollowers() {
      try {
        const { data: rows } = await supabase.from('follows')
          .select('follower_actor').eq('following_actor', currentActor!.id)
        const ids = (rows ?? []).map(r => r.follower_actor as string)
        if (ids.length === 0) { setFollowers([]); setLoading(false); return }
        const { data } = await supabase.from('actor_public').select('*').in('actor_id', ids)
        setFollowers((data as PublicActor[] | null) ?? [])
      } catch { setFollowers([]) }
      setLoading(false)
    }
    fetchFollowers()
  }, [currentActor])

  return { followers, loading }
}
