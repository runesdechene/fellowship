/**
 * QUOI     — le statut Pro d'une enseigne, son badge Certifié, et l'horizon des 6 mois du gratuit.
 * POURQUOI — une seule règle, lue par tous les écrans (Dev.md, 07/10/2026) : le Pro vit sur
 *            l'enseigne ; en gratuit, on agit sur les 6 prochains mois, on VOIT tout.
 * ATTENTION — la limite ne vit que dans la V2 (décision du 08/10/2026) : la V1 la laisse ouverte.
 *            Une date déjà posée au-delà reste modifiable : on ne bloque personne sur ses dates.
 */
import { monthsAhead } from './dates'

export interface PlanFields {
  plan: string | null
  comped_pro_until: string | null
  verified: boolean | null
}

export function isPro(entity: PlanFields | null, now: Date): boolean {
  if (!entity) return false
  if (entity.plan === 'pro') return true
  return entity.comped_pro_until !== null && new Date(entity.comped_pro_until) > now
}

export function isCertified(entity: PlanFields | null, now: Date): boolean {
  return isPro(entity, now) || entity?.verified === true
}

/** Le premier jour du septième mois : en gratuit, une date doit commencer avant. */
export function proHorizon(today: Date): Date {
  return monthsAhead(today, 6)
}

export function canActOn(startDate: Date, pro: boolean, today: Date): boolean {
  return pro || startDate < proHorizon(today)
}

/** Changer le statut d'une date : toujours permis si une participation existe déjà. */
export function canChangeStatus(
  startDate: Date,
  hasParticipation: boolean,
  pro: boolean,
  today: Date,
): boolean {
  return hasParticipation || canActOn(startDate, pro, today)
}

/** « dans 9 mois » : les mois de calendrier entre aujourd'hui et le début de la date. */
export function monthsBeyond(startDate: Date, today: Date): number {
  return (
    (startDate.getFullYear() - today.getFullYear()) * 12 + startDate.getMonth() - today.getMonth()
  )
}

/** `?plan=free` force le gratuit pour tester — en développement seulement. */
export function devOverride(search: string, isDev: boolean): 'free' | null {
  if (!isDev) return null
  return new URLSearchParams(search).get('plan') === 'free' ? 'free' : null
}
