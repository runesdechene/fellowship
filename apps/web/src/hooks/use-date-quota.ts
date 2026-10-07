import { useMemo } from 'react'
import { useAuth } from '@/lib/auth'
import { planForActor } from '@/lib/navModel'
import { useMyParticipations } from '@/hooks/use-participations'
import { countActiveDates, canAddDate, FREE_DATES_QUOTA } from '@/lib/date-quota'
import type { ActorKind } from '@/lib/explorer'

export interface DateQuota {
  used: number
  limit: number
  remaining: number
  atLimit: boolean       // entité gratuite ET plus de slot
  canAdd: boolean
  isFreeEntity: boolean   // pilote l'affichage du compteur
}

export function useDateQuota(): DateQuota {
  const { currentActor, currentActorRow } = useAuth()
  const { participations } = useMyParticipations()
  const actorKind: ActorKind = currentActor?.kind === 'entity' ? 'entity' : 'person'
  const plan = planForActor(currentActor, currentActorRow)
  const isFreeEntity = actorKind === 'entity' && plan === 'free'

  return useMemo(() => {
    const now = new Date()
    const used = countActiveDates(participations, now)
    const canAdd = canAddDate(plan, actorKind, used)
    return {
      used,
      limit: FREE_DATES_QUOTA,
      remaining: Math.max(0, FREE_DATES_QUOTA - used),
      atLimit: isFreeEntity && used >= FREE_DATES_QUOTA,
      canAdd,
      isFreeEntity,
    }
  }, [participations, plan, actorKind, isFreeEntity])
}
