/**
 * QUOI     — l'état du réseau de l'acteur actif : abonnés, amis, demandes d'ami en attente.
 * POURQUOI — la pastille de Communauté, le résumé du tableau de bord et « Ta communauté » lisent la
 *            même chose. Relu quand `when` change (l'adresse, pour la navigation) et après chaque
 *            Suivre (événement `reseau-change`), pour que la pastille s'éteigne aussitôt.
 * ATTENTION — un échec rend null : la pastille et les encadrés se taisent plutôt que de mentir.
 */
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { fetchNetwork, type Network } from '@/lib/friends'

/** L'événement envoyé par useCommunity après un Suivre réussi. */
export const NETWORK_CHANGED = 'reseau-change'

export function useNetwork(when = ''): Network | null {
  const { actor, person, entities } = useAuth()
  const [network, setNetwork] = useState<Network | null>(null)
  const [round, setRound] = useState(0)
  const own = useMemo(
    () =>
      new Set([...entities.map((entity) => entity.actor_id), ...(person ? [person.actor_id] : [])]),
    [entities, person],
  )

  useEffect(() => {
    const recount = () => setRound((r) => r + 1)
    window.addEventListener(NETWORK_CHANGED, recount)
    return () => window.removeEventListener(NETWORK_CHANGED, recount)
  }, [])

  const actorId = actor?.id
  useEffect(() => {
    if (!actorId) return
    let cancelled = false
    fetchNetwork(actorId, own).then(
      (next) => !cancelled && setNetwork(next),
      () => !cancelled && setNetwork(null),
    )
    return () => {
      cancelled = true
    }
  }, [actorId, own, when, round])

  return network
}
