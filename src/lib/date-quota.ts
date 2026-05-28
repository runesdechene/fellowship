import type { ParticipationWithEvent } from '@/types/database'
import type { ActorKind } from '@/lib/explorer'
import type { Plan } from '@/lib/navModel'

/** Plafond de dates à venir actives pour une entité gratuite (curseur monétisation). */
export const FREE_DATES_QUOTA = 5

/**
 * « Dates à venir actives » : participations dont l'événement n'est pas passé
 * (end_date >= now) et dont le statut n'est pas 'refuse'. Compteur live
 * (le retrait d'un statut fait baisser le compte).
 */
export function countActiveDates(participations: ParticipationWithEvent[], now: Date): number {
  let n = 0
  for (const p of participations) {
    if (!p.events) continue
    if (p.status === 'refuse') continue
    if (new Date(p.events.end_date).getTime() < now.getTime()) continue
    n++
  }
  return n
}

/**
 * Peut-on poser un statut de plus ? Personne et entité Pro : toujours.
 * Entité gratuite : seulement sous le quota.
 */
export function canAddDate(plan: Plan, actorKind: ActorKind, used: number): boolean {
  if (actorKind === 'person') return true
  if (plan === 'pro') return true
  return used < FREE_DATES_QUOTA
}
