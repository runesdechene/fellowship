/**
 * QUOI     — la logique pure de l'Explorer : les choix de « Quand » et la fenêtre de dates qu'ils
 *            cherchent, le titre des résultats, le motif d'une recherche par mot.
 * POURQUOI — l'écran ne fait qu'afficher ; ce qui se calcule se teste seul (explorer.test.ts).
 * ATTENTION — « Quand » vaut soit un nombre de mois (« 3 »), soit un mois précis (« 2026-12 »,
 *            venu du « Mois libre » du calendrier).
 *            Le motif retire les caractères qui casseraient un filtre PostgREST (virgule,
 *            parenthèses, %, _) : une recherche ne doit jamais faire échouer la requête.
 */
import { formatMonthLabel, monthsAhead } from './dates'
import { proHorizon } from './plan'

export const QUAND_OPTIONS = [
  { value: '12', label: 'Les 12 prochains mois', months: 12 },
  { value: '3', label: 'Les 3 prochains mois', months: 3 },
  { value: '1', label: 'Ce mois-ci', months: 1 },
] as const

/** En gratuit, on fouille ses 6 prochains mois (Dev.md, révisé le 08/10/2026) : le choix le plus
 *  large devient « Les 6 prochains mois ». */
const FREE_WIDEST = { value: '6', label: 'Les 6 prochains mois', months: 6 } as const
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

/** Les choix de « Quand » ; un mois précis demandé par l'adresse s'ajoute en tête, nommé. */
export function quandChoices(pro: boolean, quand: string | null = null): QuandChoice[] {
  const base: QuandChoice[] = pro ? [...QUAND_OPTIONS] : [FREE_WIDEST, ...QUAND_OPTIONS.slice(1)]
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

/** La fenêtre cherchée [from, to[ : un mois précis, ou les N prochains mois. En gratuit, elle
 *  s'arrête à l'horizon des 6 mois — un mois au-delà donne une fenêtre vide. */
export function searchWindow(quand: string | null, pro: boolean, today: Date): DateWindow {
  const month = monthStart(quand)
  if (!month) return { from: today, to: monthsAhead(today, windowMonths(quand, pro)) }
  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1)
  const from = month < today ? today : month
  const horizon = proHorizon(today)
  return { from, to: pro || next < horizon ? next : horizon }
}

/** En gratuit : la part de la recherche cachée au-delà de l'horizon, ou null s'il n'y en a pas. */
export function beyondWindow(quand: string | null, today: Date): DateWindow | null {
  const horizon = proHorizon(today)
  const month = monthStart(quand)
  if (!month) return { from: horizon, to: monthsAhead(today, 12) }
  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1)
  if (next <= horizon) return null
  return { from: month < horizon ? horizon : month, to: next }
}

/** La fenêtre réellement cherchée : celle de l'adresse, bornée à 6 mois en gratuit. */
export function windowMonths(value: string | null, pro: boolean): number {
  const asked = value === FREE_WIDEST.value ? FREE_WIDEST.months : quandMonths(value)
  return pro ? asked : Math.min(asked, FREE_MONTHS)
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

/** « %Lyon% » pour un `ilike`, ou null s'il ne reste rien à chercher. */
export function searchPattern(query: string): string | null {
  const cleaned = query.replace(/[%_,()]/g, '').trim()
  return cleaned === '' ? null : `%${cleaned}%`
}
