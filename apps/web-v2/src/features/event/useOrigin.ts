/**
 * QUOI     — le point de départ des distances de la fiche : les ateliers des enseignes du compte (une
 *            lecture), l'enseigne active, et la position demandée sur un clic.
 * POURQUOI — lot 13 : la distance suit l'enseigne active sans recharger ; la position n'est demandée
 *            qu'à la demande, gardée le temps de la page, jamais enregistrée.
 * ATTENTION — une lecture des ateliers qui échoue laisse la fiche sans distance, mais avec « Depuis
 *            ma position » : la carte reste utilisable, rien n'est inventé.
 */
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import type { Point } from '@/lib/distance'
import { originFor, type Origin } from '@/lib/origin'
import { supabase } from '@/lib/supabase'

const UNAVAILABLE = 'Ta position n’est pas disponible.'

export function useOrigin(): {
  origin: Origin
  askPosition: () => void
  positionError: string | null
  asking: boolean
} {
  const { entities, actor } = useAuth()
  const [bases, setBases] = useState<Map<string, Point>>(new Map())
  const [position, setPosition] = useState<Point | null>(null)
  const [positionError, setPositionError] = useState<string | null>(null)
  const [asking, setAsking] = useState(false)
  const entityIds = entities.map((entity) => entity.actor_id).join(',')

  useEffect(() => {
    if (!entityIds) return
    let cancelled = false
    async function run() {
      const { data } = await supabase
        .from('entity_bases')
        .select('entity_id, latitude, longitude')
        .in('entity_id', entityIds.split(','))
      if (cancelled || !data) return
      setBases(
        new Map(
          data.map((row) => [row.entity_id, { latitude: row.latitude, longitude: row.longitude }]),
        ),
      )
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [entityIds])

  const askPosition = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setPositionError(UNAVAILABLE)
      return
    }
    setAsking(true)
    setPositionError(null)
    navigator.geolocation.getCurrentPosition(
      (found) => {
        setAsking(false)
        setPosition({ latitude: found.coords.latitude, longitude: found.coords.longitude })
      },
      () => {
        setAsking(false)
        setPositionError(UNAVAILABLE)
      },
      { timeout: 10_000, maximumAge: 300_000 },
    )
  }, [])

  const activeEntity = actor?.kind === 'entity' ? actor.id : null
  return { origin: originFor(activeEntity, bases, position), askPosition, positionError, asking }
}
