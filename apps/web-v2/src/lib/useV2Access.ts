/**
 * QUOI     — demande à la base si le compte connecté peut ouvrir la V2.
 * POURQUOI — la coquille mince autour de access.ts : elle lit la session (useAuth), appelle
 *            is_admin() une fois par compte, et rend la décision.
 * ATTENTION — la réponse est rattachée à l'id du compte : changer de compte relance la
 *            vérification au lieu de réutiliser celle du précédent.
 */
import { useEffect, useState } from 'react'
import { useAuth } from './auth'
import { supabase } from './supabase'
import { decideAccess, toAccessState, type AccessCheck, type AccessDecision } from './access'

export function useV2Access(): AccessDecision {
  const { user, loading } = useAuth()
  const [answer, setAnswer] = useState<{ userId: string; check: AccessCheck } | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    void supabase.rpc('is_admin').then(({ data, error }) => {
      if (cancelled) return
      setAnswer({ userId: user.id, check: error ? 'error' : data ? 'allowed' : 'refused' })
    })
    return () => {
      cancelled = true
    }
  }, [user])

  const check = user && answer?.userId === user.id ? answer.check : 'pending'
  return decideAccess(toAccessState({ authLoading: loading, hasUser: Boolean(user), check }))
}
