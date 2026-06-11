import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { planForActor } from '@/lib/navModel'
import { getLastSeen } from '@/lib/community-seen'

// Badge leftbar Communauté : nb de nouveaux festivals depuis la dernière visite.
// Pro only (la ligne est lockée pour les gratuits). Choix assumé : on compte les events
// (signal dominant, requête O(1) head:true), pas chaque micro-activité réseau.
export function useCommunityBadge(): number {
  const { currentActor, currentActorRow } = useAuth()
  const { pathname } = useLocation()
  const [count, setCount] = useState(0)

  // pathname en dépendance : la Sidebar ne remonte pas à la navigation. Sans ça, le badge
  // resterait périmé après une visite de /communaute (markSeenNow met à jour le localStorage,
  // mais le compte ne serait relu qu'au reload). Recompter à chaque nav (head:true = O(1)).
  useEffect(() => {
    const isPro = planForActor(currentActor, currentActorRow) === 'pro'
    if (!currentActor || !isPro) { setCount(0); return } // eslint-disable-line react-hooks/set-state-in-effect
    let cancelled = false
    const me = currentActor.id
    const lastSeen = getLastSeen(me)
    supabase.from('events').select('id', { count: 'exact', head: true })
      .gt('created_at', lastSeen).neq('created_by_actor', me)
      .then(({ count: c }) => { if (!cancelled) setCount(c ?? 0) })
    return () => { cancelled = true }
  }, [currentActor, currentActorRow, pathname])

  return count
}
