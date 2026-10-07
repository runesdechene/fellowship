import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

export function useFollowingIds() {
  const { currentActor } = useAuth()
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!currentActor) return

    async function fetch() {
      const { data } = await supabase
        .from('follows')
        .select('following_actor')
        .eq('follower_actor', currentActor!.id)

      setFollowingIds(new Set((data ?? []).map(r => r.following_actor as string)))
    }

    fetch()
  }, [currentActor])

  return followingIds
}
