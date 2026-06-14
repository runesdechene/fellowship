import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface LandingExposant {
  actor_id: string
  label: string | null
  avatar_url: string | null
}

export interface LandingStats {
  count: number | null
  avatars: LandingExposant[]
  loading: boolean
}

const AVATAR_LIMIT = 5
/** Coup de pouce social proof : on gonfle le groupe affiché sur la landing.
 *  Appliqué seulement quand le vrai count a pu être lu (pas sur null/erreur). */
const VIRTUAL_BOOST = 50

export function useLandingExposants(): LandingStats {
  const [stats, setStats] = useState<LandingStats>({ count: null, avatars: [], loading: true })

  useEffect(() => {
    let cancelled = false
    async function run() {
      const [countRes, avatarsRes] = await Promise.all([
        supabase.from('entities').select('actor_id', { count: 'exact', head: true }).eq('type', 'exposant'),
        supabase.from('entities').select('actor_id, brand_name, avatar_url')
          .eq('type', 'exposant').not('avatar_url', 'is', null)
          .order('created_at', { ascending: false }).limit(AVATAR_LIMIT),
      ])
      if (cancelled) return
      const rows = (avatarsRes.data ?? []) as Array<{ actor_id: string; brand_name: string | null; avatar_url: string | null }>
      setStats({
        count: countRes.count != null ? countRes.count + VIRTUAL_BOOST : null,
        avatars: rows.map(r => ({ actor_id: r.actor_id, label: r.brand_name, avatar_url: r.avatar_url })),
        loading: false,
      })
    }
    run().catch(() => { if (!cancelled) setStats({ count: null, avatars: [], loading: false }) })
    return () => { cancelled = true }
  }, [])

  return stats
}
