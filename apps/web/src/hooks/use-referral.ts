import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { normalizeReferralCode, referralLink } from '@/lib/referral'

export interface ReferralOverview {
  code: string | null
  link: string | null
  rewardedCount: number
  pendingCount: number
  isAmbassador: boolean
  loading: boolean
}

interface OverviewRow {
  code: string | null
  rewarded_count: number
  pending_count: number
  is_ambassador: boolean
}

/** Code + stats de parrainage de l'entité. Crée le code à la volée (ensure_referral_code). */
export function useReferral(entityId: string | null, brandName: string | null): ReferralOverview {
  const [data, setData] = useState<ReferralOverview>({
    code: null, link: null, rewardedCount: 0, pendingCount: 0, isAmbassador: false, loading: true,
  })

  useEffect(() => {
    if (!entityId) { setData(d => ({ ...d, loading: false })); return } // eslint-disable-line react-hooks/set-state-in-effect
    let cancelled = false
    async function run() {
      const base = normalizeReferralCode(brandName ?? '')
      // 1) garantit l'existence du code.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.rpc as any)('ensure_referral_code', { p_entity_id: entityId, p_base_code: base })
      // 2) lit le code + les stats.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rows } = await (supabase.rpc as any)('get_referral_overview', { p_entity_id: entityId })
      const row = (rows as OverviewRow[] | null)?.[0] ?? null
      if (cancelled) return
      const code = row?.code ?? null
      setData({
        code,
        link: code ? referralLink(window.location.origin, code) : null,
        rewardedCount: row?.rewarded_count ?? 0,
        pendingCount: row?.pending_count ?? 0,
        isAmbassador: row?.is_ambassador ?? false,
        loading: false,
      })
    }
    run()
    return () => { cancelled = true }
  }, [entityId, brandName])

  return data
}
