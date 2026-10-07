/**
 * QUOI     — demande à la base si le compte connecté peut ouvrir la V2.
 * POURQUOI — la coquille mince autour de access.ts : elle lit la session (useAuth), appelle
 *            is_admin() quand le compte change, et rend la décision.
 * ATTENTION — la vérification suit l'id du compte, pas l'objet `user` : supabase en recrée un à
 *            chaque rafraîchissement de jeton ou retour sur l'onglet. Et une re-vérification en
 *            échec ne fait pas sortir un admin déjà admis (settleCheck) — sinon un réseau
 *            instable le renverrait sur la V1 au milieu d'une saisie.
 */
import { useEffect, useState } from 'react'
import { useAuth } from './auth'
import { supabase } from './supabase'
import {
  decideAccess,
  settleCheck,
  toAccessState,
  type AccessCheck,
  type AccessDecision,
} from './access'

export function useV2Access(): AccessDecision {
  const { user, loading } = useAuth()
  const userId = user?.id ?? null
  const [answer, setAnswer] = useState<{ userId: string; check: AccessCheck } | null>(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    void supabase.rpc('is_admin').then(({ data, error }) => {
      if (cancelled) return
      const result = error ? 'error' : data ? 'allowed' : 'refused'
      setAnswer((previous) => ({
        userId,
        check: settleCheck(previous?.userId === userId ? previous.check : undefined, result),
      }))
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  const check = userId && answer?.userId === userId ? answer.check : 'pending'
  return decideAccess(toAccessState({ authLoading: loading, hasUser: Boolean(userId), check }))
}
