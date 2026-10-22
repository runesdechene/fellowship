/**
 * QUOI     — les règles du tableau de l'équipe : l'ordre des colonnes, l'âge d'une carte, quand
 *            elle se réchauffe, ce que « Fait » montre et compte.
 * POURQUOI — maquette 2417:233 (Uriel, 22/10/2026) : un tableau pensé pour des cerveaux TDAH,
 *            où le temps qui passe se voit au lieu de se lire.
 * ATTENTION — la règle « une seule carte Maintenant par personne » vit en base (déclencheur de
 *            admin_tasks) : l'écran ne fait que recharger.
 */
import { daysUntil, startOfWeek } from './dates'

export const TASK_STATUSES = ['think', 'todo', 'now', 'done'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const STATUS_LABELS: Record<TaskStatus, string> = {
  think: 'À réfléchir',
  todo: 'À faire',
  now: 'Maintenant',
  done: 'Fait',
}

/** Une carte immobile depuis tant de jours se réchauffe. */
const STALE_DAYS = 5
/** « Fait » ne montre que les cartes arrivées depuis tant de jours. */
export const DONE_KEPT_DAYS = 7
/** « À faire » montre ses premières cartes et replie le reste. */
export const TODO_VISIBLE = 5

export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value)
}

/** La colonne d'avant et celle d'après, pour les flèches d'une carte. */
export function neighbours(status: TaskStatus): { back?: TaskStatus; next?: TaskStatus } {
  const index = TASK_STATUSES.indexOf(status)
  return { back: TASK_STATUSES[index - 1], next: TASK_STATUSES[index + 1] }
}

/** Jours passés dans sa colonne. */
function daysIn(movedAt: string, now: Date): number {
  return daysUntil(now, new Date(movedAt))
}

/** « depuis 3 j » ; rien le jour même. */
export function ageLabel(movedAt: string, now: Date): string | null {
  const days = daysIn(movedAt, now)
  return days > 0 ? `depuis ${days} j` : null
}

/** Une carte qui attend trop se réchauffe ; ce qui est fait ne presse plus. */
export function isStale(status: TaskStatus, movedAt: string, now: Date): boolean {
  return status !== 'done' && daysIn(movedAt, now) >= STALE_DAYS
}

/** L'instant à partir duquel une carte « Fait » est encore montrée. */
export function doneSince(now: Date): Date {
  const since = new Date(now)
  since.setDate(since.getDate() - DONE_KEPT_DAYS)
  return since
}

/** Les cartes passées dans « Fait » depuis lundi. */
export function doneThisWeek(doneMovedAt: readonly string[], now: Date): number {
  const monday = startOfWeek(now).getTime()
  return doneMovedAt.filter((movedAt) => new Date(movedAt).getTime() >= monday).length
}
