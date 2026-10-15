/**
 * QUOI     — la logique pure de l'Explorer : les choix de « Quand » et la fenêtre de dates qu'ils
 *            cherchent, le titre des résultats, le motif d'une recherche par mot.
 * POURQUOI — l'écran ne fait qu'afficher ; ce qui se calcule se teste seul (explorer.test.ts).
 *            L'horizon dit combien de mois on fouille : 3 sans compte, 6 en gratuit, sans borne
 *            en Pro (règles du 08/10 et du 14/10/2026).
 * ATTENTION — « Quand » vaut soit un nombre de mois (« 3 »), soit un mois précis (« 2026-12 »,
 *            venu du « Mois libre » du calendrier).
 *            Le motif retire les caractères qui casseraient un filtre PostgREST (virgule,
 *            parenthèses, %, _) : une recherche ne doit jamais faire échouer la requête.
 */
import { formatMonthLabel, monthName, monthsAhead } from './dates'

export const QUAND_OPTIONS = [
  { value: '12', label: 'Les 12 prochains mois', months: 12 },
  { value: '3', label: 'Les 3 prochains mois', months: 3 },
  { value: '1', label: 'Ce mois-ci', months: 1 },
] as const

/** Les mois que la recherche fouille : 3 sans compte, 6 en gratuit, `null` en Pro — sans borne. */
export type Horizon = number | null
export const GUEST_MONTHS = 3
export const FREE_MONTHS = 6

const MONTH_KEY = /^(\d{4})-(\d{2})$/

/** Le 1er du mois d'une valeur « 2026-12 », ou null si ce n'est pas un mois précis. */
function monthStart(value: string | null): Date | null {
  const match = value ? MONTH_KEY.exec(value) : null
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, 1) : null
}

export interface QuandChoice {
  value: string
  label: string
  months: number
}

/** Le choix le plus large d'un horizon borné : « Les 6 prochains mois ». */
function widest(horizon: number): QuandChoice {
  return { value: String(horizon), label: `Les ${horizon} prochains mois`, months: horizon }
}

/** Les choix de « Quand » ; un mois précis demandé par l'adresse s'ajoute en tête, nommé. */
export function quandChoices(horizon: Horizon, quand: string | null = null): QuandChoice[] {
  const base: QuandChoice[] =
    horizon === null
      ? [...QUAND_OPTIONS]
      : [widest(horizon), ...QUAND_OPTIONS.filter((option) => option.months < horizon)]
  const month = monthStart(quand)
  if (!month || quand === null) return base
  return [
    { value: quand, label: `${formatMonthLabel(month)} ${month.getFullYear()}`, months: 1 },
    ...base,
  ]
}

export interface DateWindow {
  from: Date
  to: Date
}

/** La fenêtre cherchée [from, to[ : un mois précis, ou les N prochains mois. Un horizon borné
 *  l'arrête — un mois au-delà donne une fenêtre vide. */
export function searchWindow(quand: string | null, horizon: Horizon, today: Date): DateWindow {
  const month = monthStart(quand)
  if (!month) return { from: today, to: monthsAhead(today, windowMonths(quand, horizon)) }
  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1)
  const from = month < today ? today : month
  if (horizon === null) return { from, to: next }
  const limit = monthsAhead(today, horizon)
  return { from, to: next < limit ? next : limit }
}

/** La part de la recherche cachée au-delà de l'horizon, ou null s'il n'y en a pas. */
export function beyondWindow(
  quand: string | null,
  today: Date,
  horizon: number,
): DateWindow | null {
  const limit = monthsAhead(today, horizon)
  const month = monthStart(quand)
  if (!month) return { from: limit, to: monthsAhead(today, 12) }
  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1)
  if (next <= limit) return null
  return { from: month < limit ? limit : month, to: next }
}

/** La fenêtre réellement cherchée : celle de l'adresse, bornée par l'horizon. */
export function windowMonths(value: string | null, horizon: Horizon): number {
  if (horizon === null) return quandMonths(value)
  const asked = value === String(horizon) ? horizon : quandMonths(value)
  return Math.min(asked, horizon)
}

/** Le 1er du dernier mois fouillé : « 42 festivals t'attendent après mars ». */
export function lastOpenMonth(today: Date, horizon: number): Date {
  return monthsAhead(today, horizon - 1)
}

/** Le nombre de mois de la fenêtre, lu dans l'adresse ; douze par défaut. */
export function quandMonths(value: string | null): number {
  return QUAND_OPTIONS.find((option) => option.value === value)?.months ?? 12
}

/** « 22 résultats pour « Lyon » », « Aucun résultat pour « Lyon » ». */
export function resultsTitle(count: number, query: string): string {
  if (count === 0) return `Aucun résultat pour « ${query} »`
  return `${count} ${count > 1 ? 'résultats' : 'résultat'} pour « ${query} »`
}

/** Le titre de la recherche publique : « 16 festivals dans les 3 prochains mois. » ; avec des
 *  mots, celui des résultats. */
export function publicTitle(count: number, query: string, months: number): string {
  if (query.trim() !== '') return `${resultsTitle(count, query.trim())}.`
  const when = months === 1 ? 'ce mois-ci' : `dans les ${months} prochains mois`
  if (count === 0) return `Aucun festival ${when}.`
  return `${count} ${count > 1 ? 'festivals' : 'festival'} ${when}.`
}

/** « 13 festivals de plus t'attendent après décembre. » */
export function beyondTitle(count: number, month: Date): string {
  const verb = count > 1 ? 'festivals de plus t’attendent' : 'festival de plus t’attend'
  return `${count} ${verb} après ${monthName(month)}.`
}

/** « %Lyon% » pour un `ilike`, ou null s'il ne reste rien à chercher. */
export function searchPattern(query: string): string | null {
  const cleaned = query.replace(/[%_,()]/g, '').trim()
  return cleaned === '' ? null : `%${cleaned}%`
}
