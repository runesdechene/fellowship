/**
 * QUOI     — les règles du tableau de l'équipe : où tombe une carte dans un paquet, depuis quand
 *            elle y est, quand elle se réchauffe, ce que « Terminé » montre, compte et efface.
 * POURQUOI — maquette 2432:306 (Uriel, 22/10/2026) : chacun a son paquet et n'en voit que la carte
 *            du dessus ; le temps qui passe se voit au lieu de se lire.
 * ATTENTION — une position plus petite est plus haut dans le paquet.
 */
import { daysUntil, startOfWeek } from './dates'

export const TASK_STATUSES = ['idea', 'deck', 'done'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

/** Une carte immobile depuis tant de jours se réchauffe. */
const STALE_DAYS = 5
/** « Terminé » garde les cartes tant de jours, de plus en plus pâles. */
export const DONE_KEPT_DAYS = 7

export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value)
}

/**
 * La place d'une carte qu'on ajoute : au hasard dans le paquet, ou dessus si elle est urgente.
 * `random` est passé pour que le hasard se teste.
 */
export function insertPosition(
  positions: readonly number[],
  urgent: boolean,
  random: () => number = Math.random,
): number {
  if (positions.length === 0) return 0
  const top = Math.min(...positions)
  if (urgent) return top - 1
  const bottom = Math.max(...positions)
  return top + random() * (bottom - top)
}

/** « Plus tard » : sous toutes les autres. */
export function laterPosition(positions: readonly number[]): number {
  return positions.length === 0 ? 0 : Math.max(...positions) + 1
}

/** Jours passés là où la carte est. */
function daysIn(movedAt: string, now: Date): number {
  return daysUntil(now, new Date(movedAt))
}

/** « depuis 3 jours » ; « depuis aujourd'hui » le jour même. */
export function sinceLabel(movedAt: string, now: Date): string {
  const days = daysIn(movedAt, now)
  if (days <= 0) return 'depuis aujourd’hui'
  return days === 1 ? 'depuis hier' : `depuis ${days} jours`
}

/** Une carte qui attend trop dans un paquet se réchauffe. */
export function isStale(movedAt: string, now: Date): boolean {
  return daysIn(movedAt, now) >= STALE_DAYS
}

/** L'instant à partir duquel une carte terminée est encore montrée. */
export function doneSince(now: Date): Date {
  const since = new Date(now)
  since.setDate(since.getDate() - DONE_KEPT_DAYS)
  return since
}

/** Les cartes terminées depuis lundi. */
export function doneThisWeek(doneMovedAt: readonly string[], now: Date): number {
  const monday = startOfWeek(now).getTime()
  return doneMovedAt.filter((movedAt) => new Date(movedAt).getTime() >= monday).length
}

/** Combien un jour de « Terminé » est encore visible : plein aujourd'hui, presque effacé au 7e. */
export function fadeFor(daysAgo: number): number {
  return Math.max(0.1, 1 - daysAgo * 0.15)
}

/** Les cartes terminées, rangées par jour, le plus récent d'abord. */
export function groupByDay<T extends { movedAt: string }>(
  tasks: readonly T[],
  now: Date,
): { daysAgo: number; date: Date; tasks: T[] }[] {
  const days = new Map<number, { daysAgo: number; date: Date; tasks: T[] }>()
  for (const task of [...tasks].sort((a, b) => b.movedAt.localeCompare(a.movedAt))) {
    const date = new Date(task.movedAt)
    const daysAgo = daysIn(task.movedAt, now)
    const day = days.get(daysAgo) ?? { daysAgo, date, tasks: [] }
    day.tasks.push(task)
    days.set(daysAgo, day)
  }
  return [...days.values()].sort((a, b) => a.daysAgo - b.daysAgo)
}

const CHEERS = ['Une de moins.', 'Carte gagnée.', 'Bien joué.', 'Rangée.']

/** La phrase qui salue la `n`-ième carte faite de la journée ; vider son paquet a la sienne. */
export function victoryPhrase(n: number, emptied: boolean): string {
  if (emptied) return 'Paquet vide. Tout est fait.'
  if (n === 1) return 'Première carte. C’est parti.'
  if (n === 2) return 'Et de deux.'
  if (n === 3) return 'Trois aujourd’hui. Ça roule.'
  if (n === 5) return 'Cinq. Belle journée.'
  return CHEERS[n % CHEERS.length] ?? 'Bien joué.'
}
