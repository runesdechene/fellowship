import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { getLastSeen } from '@/lib/community-seen'

// Badge leftbar Communauté : nb de nouveaux festivals depuis la dernière visite.
// Ouvert à tous depuis la décision 0006 (la Communauté n'est plus Pro) — c'est justement
// ce badge qui ramène le gratuit sur la page qui fait circuler le produit. Choix assumé :
// on compte les events (signal dominant, requête O(1) head:true), pas chaque micro-activité.
export function useCommunityBadge(): number {
  const { currentActor } = useAuth()
  const { pathname } = useLocation()
  const [count, setCount] = useState(0)

  // pathname en dépendance : la Sidebar ne remonte pas à la navigation. Sans ça, le badge
  // resterait périmé après une visite de /communaute (markSeenNow met à jour le localStorage,
  // mais le compte ne serait relu qu'au reload). Recompter à chaque nav (head:true = O(1)).
  useEffect(() => {
    if (!currentActor) { setCount(0); return } // eslint-disable-line react-hooks/set-state-in-effect
    let cancelled = false
    const me = currentActor.id
    const lastSeen = getLastSeen(me)
    supabase.from('events').select('id', { count: 'exact', head: true })
      .eq('is_private', false)   // ne pas compter les events privés (cohérent avec le fil)
      .gt('created_at', lastSeen).neq('created_by_actor', me)
      .then(({ count: c }) => { if (!cancelled) setCount(c ?? 0) })
    return () => { cancelled = true }
  }, [currentActor, pathname])

  return count
}
