/**
 * QUOI     — l'état du réseau de l'acteur actif : abonnés, amis, demandes d'ami en attente.
 * POURQUOI — la pastille de Communauté, le résumé du tableau de bord et « Ta communauté » lisent la
 *            même chose. Relu quand `when` change (l'adresse, pour la navigation) et après chaque
 *            Suivre ou Refuser (événement `reseau-change`), pour que la pastille s'éteigne aussitôt.
 * ATTENTION — un échec rend null : la pastille et les encadrés se taisent plutôt que de mentir.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { declineRequest, fetchNetwork, type Network } from '@/lib/friends'

/** L'événement envoyé après un Suivre ou un Refuser réussi. */
export const NETWORK_CHANGED = 'reseau-change'

export function useNetwork(when = '') {
  const { actor, person, entities } = useAuth()
  const [network, setNetwork] = useState<Network | null>(null)
  const [round, setRound] = useState(0)
  const [declined, setDeclined] = useState<ReadonlySet<string>>(new Set())
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

  /** Refuser : la demande s'efface aussitôt ; si l'écriture échoue, elle revient. */
  const decline = useCallback(
    async (followerId: string) => {
      if (!actorId) return
      setDeclined((current) => new Set([...current, followerId]))
      try {
        await declineRequest(actorId, followerId)
        window.dispatchEvent(new Event(NETWORK_CHANGED))
      } catch {
        setDeclined((current) => new Set([...current].filter((id) => id !== followerId)))
      }
    },
    [actorId],
  )

  return { network, declined, decline }
}
