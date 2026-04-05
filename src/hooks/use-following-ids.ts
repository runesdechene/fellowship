import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

export function useFollowingIds() {
  const { user } = useAuth()
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) return

    async function fetch() {
      const { data } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user!.id)

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFollowingIds(new Set((data ?? []).map(r => r.following_id)))
    }

    fetch()
  }, [user])

  return followingIds
}
