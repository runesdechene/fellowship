/**
 * QUOI     — le calendrier de l'e-reporting et la lecture d'une journée : les décades d'un mois et
 *            leur échéance, l'état affiché d'un jour, les montants envoyés à SuperPDP.
 * POURQUOI — la zone Reporting (maquette 2795:233) ne fait qu'afficher ce que ces fonctions
 *            calculent ; elles se testent seules (reporting.test.ts).
 * ATTENTION — shortcut : seul le réel normal mensuel (trois décades par mois) est dessiné, c'est le
 *            régime de Runes de Chêne ; les autres régimes déclarent au mois, à faire le jour où une
 *            enseigne en aura besoin.
 */
import type { Json } from '@/types/supabase'
import { addDays, dayOfMonth, monthName, todayIso } from './dates'

export type DayStatus =
  'en_attente' | 'a_verifier' | 'prete' | 'en_cours' | 'envoyee' | 'refusee' | 'inconnue' | 'vide'

/** La forme dessinée d'un jour : coche, point d'exclamation, demi-cercle, tiret, cercle vide. */
export type DayMark = 'envoyee' | 'verifier' | 'attente' | 'vide' | 'venir'

export interface Decade {
  index: 1 | 2 | 3
  start: Date
  end: Date
  /** Les données parviennent à l'administration dans les dix jours qui suivent (BOFiP). */
  deadline: Date
  days: Date[]
}

/** Les trois décades d'un mois : du 1er au 10, du 11 au 20, du 21 au dernier jour. */
export function decadesOf(month: Date): Decade[] {
  const year = month.getFullYear()
  const index = month.getMonth()
  const lastDay = new Date(year, index + 1, 0).getDate()
  const bounds: [1 | 2 | 3, number, number][] = [
    [1, 1, 10],
    [2, 11, 20],
    [3, 21, lastDay],
  ]
  return bounds.map(([position, from, to]) => {
    const start = new Date(year, index, from)
    const end = new Date(year, index, to)
    const days = Array.from({ length: to - from + 1 }, (_, offset) => addDays(start, offset))
    return { index: position, start, end, deadline: addDays(end, 10), days }
  })
}

/** Le mois d'une adresse (`?mois=2026-10`), ou null si elle n'en porte pas de valide. */
export function parseMonthKey(value: string | null): Date | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? '')
  if (!match) return null
  const month = Number(match[2])
  return month >= 1 && month <= 12 ? new Date(Number(match[1]), month - 1, 1) : null
}

/** La décade où tombe un jour. */
export function decadeOf(day: Date): Decade {
  const position = day.getDate() <= 10 ? 0 : day.getDate() <= 20 ? 1 : 2
  const decade = decadesOf(day)[position]
  if (!decade) throw new Error('décade introuvable')
  return decade
}

/** La prochaine échéance : la plus proche décade commencée dont la date limite n'est pas passée. */
export function nextDeadline(today: Date): Decade {
  const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const candidates = [...decadesOf(previousMonth), ...decadesOf(today)]
  const due = candidates.find(
    (decade) => decade.start <= today && decade.deadline >= startOf(today),
  )
  return due ?? decadeOf(today)
}

/** « Du 1er au 10 novembre » */
export function decadeTitle(decade: Decade): string {
  return `Du ${dayOfMonth(decade.start)} au ${dayOfMonth(decade.end)} ${monthName(decade.end)}`
}

/** « du 1er au 10 » : la même, dans une phrase où le mois est déjà dit. */
export function decadeSpan(decade: Decade): string {
  return `du ${dayOfMonth(decade.start)} au ${dayOfMonth(decade.end)}`
}

const STATES: Record<DayStatus, { mark: DayMark; label: string }> = {
  envoyee: { mark: 'envoyee', label: 'Envoyée' },
  a_verifier: { mark: 'verifier', label: 'À vérifier' },
  refusee: { mark: 'verifier', label: 'Refusée' },
  inconnue: { mark: 'verifier', label: 'À vérifier à la main' },
  en_attente: { mark: 'attente', label: 'En attente' },
  prete: { mark: 'attente', label: 'Prête à partir' },
  en_cours: { mark: 'attente', label: 'En cours d’envoi' },
  vide: { mark: 'vide', label: 'Aucune vente' },
}

/** L'état affiché d'un jour ; un jour passé sans ligne n'a pas encore été lu. */
export function dayState(status: DayStatus | null, day: Date, today: Date) {
  if (status) return STATES[status]
  const gap = startOf(day).getTime() - startOf(today).getTime()
  if (gap === 0) return { mark: 'venir' as const, label: 'Aujourd’hui' }
  if (gap > 0) return { mark: 'venir' as const, label: 'À venir' }
  return { mark: 'attente' as const, label: 'Pas encore lue' }
}

const STATUSES = Object.keys(STATES)

/** Le statut lu en base, vérifié : une valeur inconnue ne s'affiche pas comme envoyée. */
export function toDayStatus(value: string): DayStatus | null {
  return STATUSES.includes(value) ? (value as DayStatus) : null
}

/** Le titre de la page : ce qui presse d'abord, sinon jusqu'où tout est parti. */
export function reportingHeadline(blocked: number, waiting: number, lastSent: Date | null) {
  if (blocked === 1) return 'Une journée attend ta vérification.'
  if (blocked > 1) return `${blocked} journées attendent ta vérification.`
  if (waiting === 1) return 'Une journée attend encore une source.'
  if (waiting > 1) return `${waiting} journées attendent encore une source.`
  if (lastSent) return `Tout est déclaré jusqu’au ${dayOfMonth(lastSent)} ${monthName(lastSent)}.`
  return 'Rien n’est encore déclaré.'
}

/** « 844 256 537 » : un SIREN se lit par groupes de trois. */
export function formatSiren(siren: string): string {
  return siren.replace(/\s/g, '').replace(/(\d{3})(?=\d)/g, '$1 ')
}

export const REGIMES: Record<string, string> = {
  monthly: 'Réel normal mensuel',
  quarterly: 'Réel normal trimestriel',
  simplified: 'Réel simplifié',
  vat_exemption: 'Franchise en base',
}

/** Une journée bloquée attend une décision humaine : elle ne partira pas seule. */
export function isBlocked(status: DayStatus): boolean {
  return status === 'a_verifier' || status === 'refusee' || status === 'inconnue'
}

/** HT et TVA en centimes, tels qu'envoyés (ou prêts à l'être) : la somme des lignes SuperPDP. */
export function sentAmounts(lignes: Json): { ht: number; tva: number } | null {
  if (!Array.isArray(lignes) || lignes.length === 0) return null
  let ht = 0
  let tva = 0
  for (const line of lignes) {
    if (!isObject(line)) return null
    ht += cents(line.tax_exclusive_amount)
    tva += cents(line.tax_total)
  }
  return { ht, tva }
}

/** Ce qu'une source a donné ce jour-là, en centimes : null si elle n'a pas répondu. */
export function sourceAmount(detail: Json, source: 'shopify' | 'sumup'): number | null {
  if (!isObject(detail)) return null
  const entry = detail[source]
  if (!isObject(entry)) return null
  return typeof entry.ttc === 'number' ? entry.ttc : null
}

/** Les sources muettes d'un jour : celles qui figurent au détail sans montant. */
export function silentSources(detail: Json): string[] {
  if (!isObject(detail)) return []
  return Object.entries(detail)
    .filter(([, entry]) => entry === null)
    .map(([source]) => SOURCE_NAMES[source] ?? source)
}

export interface Sale {
  source: 'shopify' | 'sumup'
  reference: string
  ttc: number
  link: string | null
  invoiced: boolean
}

/** Les ventes qu'un jour a gardées, source par source ; un marquage les retire du total. */
export function salesOf(detail: Json): Sale[] {
  if (!isObject(detail)) return []
  return (['shopify', 'sumup'] as const).flatMap((source) => {
    const entry = detail[source]
    if (!isObject(entry) || !Array.isArray(entry.liste)) return []
    return entry.liste.filter(isObject).map((sale) => ({
      source,
      reference:
        typeof sale.nom === 'string' ? sale.nom : typeof sale.code === 'string' ? sale.code : '',
      ttc: typeof sale.ttc === 'number' ? sale.ttc : 0,
      link: typeof sale.lien === 'string' ? sale.lien : null,
      invoiced: sale.facturee === true,
    }))
  })
}

/** Une journée partie, ou en cours d'envoi, ne se corrige plus. */
export function isLocked(status: DayStatus | null): boolean {
  return (
    status === 'en_cours' || status === 'envoyee' || status === 'refusee' || status === 'inconnue'
  )
}

export interface Declaration {
  debut: string
  fin: string
  statut: string | null
}

const DECLARATION_STATES: Record<string, { label: string; tone: string }> = {
  'ppf:ereporting': { label: 'Transmise', tone: 'neutral' },
  'ppf:ereporting-ack': { label: 'Reçue', tone: 'sent' },
  'ppf:ereporting-response-ok': { label: 'Acceptée', tone: 'validated' },
  'ppf:ereporting-ack-error': { label: 'Rejetée', tone: 'rejected' },
  'ppf:ereporting-rejected': { label: 'Rejetée', tone: 'rejected' },
}

/** Ce qu'a répondu l'administration sur une décade ; null si elle n'est pas encore partie. */
export function declarationState(declarations: Declaration[] | null, decade: Decade) {
  const compact = (date: Date) => todayIso(date).replace(/-/g, '')
  const found = declarations?.find((entry) => entry.debut === compact(decade.start))
  if (!found) return null
  return DECLARATION_STATES[found.statut ?? ''] ?? { label: 'Transmise', tone: 'neutral' }
}

export const SOURCE_NAMES: Record<string, string> = { shopify: 'Shopify', sumup: 'SumUp' }

export interface Anomaly {
  message: string
  detail: string | null
  lien: string | null
}

/** Les anomalies d'un jour, telles que le serveur les a notées. */
export function anomaliesOf(value: Json): Anomaly[] {
  if (!Array.isArray(value)) return []
  return value.filter(isObject).map((entry) => ({
    message: typeof entry.message === 'string' ? entry.message : 'anomalie',
    detail: typeof entry.detail === 'string' ? entry.detail : null,
    lien: typeof entry.lien === 'string' ? entry.lien : null,
  }))
}

function cents(value: Json | undefined): number {
  return typeof value === 'string' ? Math.round(Number(value) * 100) : 0
}

function isObject(value: Json | undefined): value is { [key: string]: Json | undefined } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function startOf(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}
