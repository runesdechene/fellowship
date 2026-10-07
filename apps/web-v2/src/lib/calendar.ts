/**
 * QUOI     — la logique pure du calendrier : ranger les dates par mois, compter, composer la phrase d'en-tête, regrouper les compagnons.
 * POURQUOI — l'écran ne fait qu'afficher ; tout ce qui se calcule vit ici et se teste seul
 *            (calendar.test.ts).
 * ATTENTION — une date à cheval sur deux mois va dans le mois où elle COMMENCE ; une date déjà
 *            commencée avant la fenêtre est rangée dans le premier mois.
 */
import { monthKey, type MonthSlot } from './dates'

const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })

/** « Aucune date », « 1 date », « 4 dates ». */
export function countLabel(count: number): string {
  if (count === 0) return 'Aucune date'
  return `${count} ${count === 1 ? 'date' : 'dates'}`
}

/**
 * Range des dates dans les mois de la fenêtre, triées par début. Chaque mois a sa liste, vide
 * quand il n'a rien : c'est ce qui permet d'afficher « Mois libre ».
 */
export function bucketByStartMonth<T extends { startDate: Date }>(
  items: T[],
  months: MonthSlot[],
): Map<string, T[]> {
  const buckets = new Map<string, T[]>(months.map((month) => [month.key, []]))
  const first = months[0]
  const sorted = [...items].sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  for (const item of sorted) {
    const key = first && item.startDate < first.date ? first.key : monthKey(item.startDate)
    buckets.get(key)?.push(item)
  }
  return buckets
}

/** « 6 dates d’ici septembre 2027 · la prochaine dans 18 jours ». */
export function calendarHeadline(
  count: number,
  lastMonth: Date,
  daysToNext: number | null,
): string {
  const span = `${countLabel(count)} d’ici ${MONTH_YEAR_FORMATTER.format(lastMonth)}`
  if (daysToNext === null) return span
  const when =
    daysToNext <= 0 ? 'aujourd’hui' : daysToNext === 1 ? 'demain' : `dans ${daysToNext} jours`
  return `${span} · la prochaine ${when}`
}

interface CompanionRow<F extends { id: string }> {
  eventId: string
  friend: F
}

/**
 * Les amis qui vont à un festival où je ne vais pas, regroupés par festival — dans l'ordre
 * d'arrivée des lignes, chaque ami une seule fois.
 */
export function groupCompanions<F extends { id: string }>(
  rows: CompanionRow<F>[],
  myEventIds: Set<string>,
): Map<string, F[]> {
  const grouped = new Map<string, F[]>()
  for (const { eventId, friend } of rows) {
    if (myEventIds.has(eventId)) continue
    const list = grouped.get(eventId) ?? []
    if (!list.some((f) => f.id === friend.id)) list.push(friend)
    grouped.set(eventId, list)
  }
  return grouped
}
