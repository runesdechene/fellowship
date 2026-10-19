/**
 * QUOI     — le parrainage d'une enseigne : son code (créé à la première visite), ses filleuls payants
 *            et en attente, son badge Ambassadeur.
 * POURQUOI — chantier 3 (19/10/2026) : la carte « Parraine un exposant » de /pro.
 * ATTENTION — le code naît du nom de l'enseigne ; la base règle les doublons (RUNES, RUNES2…).
 */
import { useEffect, useState } from 'react'
import { referralBase } from '@/lib/referral'
import { must, supabase } from '@/lib/supabase'

export interface Referral {
  code: string
  rewarded: number
  pending: number
  ambassador: boolean
}

async function loadReferral(entityId: string, brandName: string): Promise<Referral | null> {
  must(
    await supabase.rpc('ensure_referral_code', {
      p_entity_id: entityId,
      p_base_code: referralBase(brandName),
    }),
  )
  const rows = must(await supabase.rpc('get_referral_overview', { p_entity_id: entityId }))
  const row = rows[0]
  if (!row?.code) return null
  return {
    code: row.code,
    rewarded: row.rewarded_count,
    pending: row.pending_count,
    ambassador: row.is_ambassador,
  }
}

export function useReferral(entityId: string, brandName: string) {
  const [referral, setReferral] = useState<Referral | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const loaded = await loadReferral(entityId, brandName)
        if (cancelled) return
        setReferral(loaded)
        setFailed(loaded === null)
      } catch {
        if (!cancelled) setFailed(true)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [entityId, brandName])

  return { referral, failed }
}
