/**
 * QUOI     — à qui appartient le code de parrainage tapé ? Vérifié 400 ms après la dernière frappe.
 * POURQUOI — spec du 21/10/2026 : « Aucun code de parrainage trouvé », ou ce que le code fait gagner,
 *            avant de créer la vitrine. `referral_owner` lit sans rien attribuer.
 * ATTENTION — rend `undefined` tant que rien n'est sûr (moins de 3 caractères, vérification en
 *            cours, lecture ratée) : une coupure ne dit jamais « introuvable ». La réponse garde le
 *            code qu'elle concerne, donc une réponse en retard sur un code changé ne s'affiche pas.
 */
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const DELAY_MS = 400
const MIN_LENGTH = 3

export function useReferralOwner(code: string, enabled: boolean): string | null | undefined {
  const [answer, setAnswer] = useState<{ code: string; owner: string | null } | null>(null)
  const active = enabled && code.length >= MIN_LENGTH

  useEffect(() => {
    if (!active) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      void supabase.rpc('referral_owner', { p_code: code }).then(({ data, error }) => {
        if (cancelled || error) return
        setAnswer({ code, owner: data })
      })
    }, DELAY_MS)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [code, active])

  return active && answer?.code === code ? answer.owner : undefined
}
