/**
 * QUOI     — le statut de l'acteur actif : Pro, Certifié.
 * POURQUOI — chaque écran le lit d'ici ; rien n'est rechargé, les enseignes viennent de useAuth.
 * ATTENTION — `?plan=free` force le gratuit en développement, et seulement là (devOverride) : le
 *            choix tient pour l'onglet (sessionStorage), pour qu'on puisse naviguer.
 */
import { useMemo } from 'react'
import { useAuth } from './auth'
import { devOverride, isCertified, isPro } from './plan'

const FORCE_KEY = 'flwsh-v2-plan'

function forcedFree(): boolean {
  if (!import.meta.env.DEV) return false
  const asked = devOverride(window.location.search, true) === 'free'
  try {
    if (asked) sessionStorage.setItem(FORCE_KEY, 'free')
    return sessionStorage.getItem(FORCE_KEY) === 'free'
  } catch {
    return asked
  }
}

export function usePlan(): { pro: boolean; certified: boolean } {
  const { actor, entities } = useAuth()
  const actorId = actor?.id
  return useMemo(() => {
    const entity = entities.find((row) => row.actor_id === actorId) ?? null
    if (forcedFree()) return { pro: false, certified: entity?.verified === true }
    const now = new Date()
    return { pro: isPro(entity, now), certified: isCertified(entity, now) }
  }, [actorId, entities])
}
