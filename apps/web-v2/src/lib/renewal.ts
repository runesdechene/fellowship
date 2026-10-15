/**
 * QUOI     — la ligne sous « Prochain renouvellement » : « dans 12 j », « dans 5 mois », ou
 *            « échu il y a 34 j » quand la fin de période est passée.
 * POURQUOI — une fin de période dépassée ne doit jamais se lire comme un renouvellement à venir.
 */
import { daysUntil } from './dates'

const MONTHS_FROM_DAYS = 60

/** Mois calendaires entiers entre `from` et `to` (to ≥ from). */
function wholeMonths(from: Date, to: Date): number {
  const months = (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth()
  return to.getDate() < from.getDate() ? months - 1 : months
}

export function renewalAhead(end: Date, now: Date): string {
  const days = daysUntil(end, now)
  if (days < 0) return `échu il y a ${-days} j`
  if (days < MONTHS_FROM_DAYS) return days === 0 ? 'aujourd’hui' : `dans ${days} j`
  return `dans ${wholeMonths(now, end)} mois`
}
