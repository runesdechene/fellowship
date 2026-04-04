import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { Profile } from '@/types/database'

export function useFollowStatus(targetId: string | undefined) {
  const { user } = useAuth()
  const [isFollowing, setIsFollowing] = useState(false)
  const [isFriend, setIsFriend] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !targetId || user.id === targetId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
      return
    }

    async function check() {
      const { data: myFollow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user!.id)
        .eq('following_id', targetId!)
        .maybeSingle()

      const { data: theirFollow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', targetId!)
        .eq('following_id', user!.id)
        .maybeSingle()

      setIsFollowing(!!myFollow)
      setIsFriend(!!myFollow && !!theirFollow)
      setLoading(false)
    }

    check()
  }, [user, targetId])

  const toggleFollow = async () => {
    if (!user || !targetId) return

    if (isFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetId)
      setIsFollowing(false)
      setIsFriend(false)
    } else {
      await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: targetId })
      setIsFollowing(true)
      const { data: theirFollow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', targetId)
        .eq('following_id', user.id)
        .maybeSingle()
      setIsFriend(!!theirFollow)
    }
  }

  return { isFollowing, isFriend, loading, toggleFollow }
}

export function useMyFriends() {
  const { user } = useAuth()
  const [friends, setFriends] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function fetch() {
      const { data: friendRows } = await supabase.rpc('get_friend_ids', { p_user_id: user!.id })
      const friendIds = friendRows as string[] | null
      if (!friendIds || friendIds.length === 0) {
        setFriends([])
        setLoading(false)
        return
      }
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', friendIds)
      setFriends(profiles ?? [])
      setLoading(false)
    }
    fetch()
  }, [user])

  return { friends, loading }
}

export function useMyFollowers() {
  const { user } = useAuth()
  const [followers, setFollowers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function fetch() {
      const { data } = await supabase
        .from('follows')
        .select('profiles!follows_follower_id_fkey(*)')
        .eq('following_id', user!.id)
      setFollowers(data?.map((f: { profiles: Profile }) => f.profiles).filter(Boolean) ?? [])
      setLoading(false)
    }
    fetch()
  }, [user])

  return { followers, loading }
}
