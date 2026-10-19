/**
 * QUOI     — l'état du réseau de l'acteur actif (lib/network.ts), et les deux réponses à une
 *            demande d'ami : suivre en retour, refuser.
 * POURQUOI — la pastille de Communauté, la cloche, le résumé du tableau de bord, « Ta communauté »
 *            et les listes Mes amis / Mes abonnés lisent la même chose. Relu quand `when` change
 *            (l'adresse, pour la navigation) et après chaque Suivre ou Refuser (événement
 *            `reseau-change`), pour que tous s'accordent aussitôt.
 * ATTENTION — un échec de lecture rend `failed` : la pastille et les encadrés se taisent, une liste
 *            le dit. Une réponse est optimiste (`answered`) ; si l'écriture échoue, elle revient.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { declineRequest, fetchNetwork, followBack, type Network } from '@/lib/network'

/** L'événement envoyé après un Suivre ou un Refuser réussi, où qu'il ait eu lieu. */
export const NETWORK_CHANGED = 'reseau-change'

export function useNetwork(when = '') {
  const { actor, person, entities } = useAuth()
  const [network, setNetwork] = useState<Network | null>(null)
  const [failed, setFailed] = useState(false)
  const [round, setRound] = useState(0)
  const [answered, setAnswered] = useState<ReadonlySet<string>>(new Set())
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
      (next) => {
        if (cancelled) return
        setNetwork(next)
        setFailed(false)
      },
      () => {
        if (cancelled) return
        setNetwork(null)
        setFailed(true)
      },
    )
    return () => {
      cancelled = true
    }
  }, [actorId, own, when, round])

  const answer = useCallback(
    async (id: string, write: (actorId: string, id: string) => Promise<void>) => {
      if (!actorId) return
      setAnswered((current) => new Set([...current, id]))
      try {
        await write(actorId, id)
        window.dispatchEvent(new Event(NETWORK_CHANGED))
      } catch {
        setAnswered((current) => new Set([...current].filter((other) => other !== id)))
      }
    },
    [actorId],
  )

  return {
    network,
    failed,
    answered,
    followBack: (id: string) => void answer(id, followBack),
    decline: (id: string) => void answer(id, declineRequest),
  }
}
