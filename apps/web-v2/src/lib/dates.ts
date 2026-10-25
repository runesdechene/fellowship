/**
 * QUOI     — toute la logique calendaire de la V2 : lire, comparer, compter et formater les
 *            dates.
 * POURQUOI — les dates de la base sont des DATE Postgres (« 2026-09-25 ») sans fuseau : on les
 *            manipule en local pour éviter le décalage d'un jour.
 * ATTENTION — aucune date ne se recalcule ailleurs. Les tests (dates.test.ts) surveillent le
 *            fuseau, épinglé sur Europe/Paris.
 */

/** Convertit une date SQL « AAAA-MM-JJ » en Date locale à minuit. */
export function parseSqlDate(value: string): Date {
  // Une date-heure SANS fuseau est lue en heure locale (norme ECMAScript) — contrairement à
  // « AAAA-MM-JJ » seule, lue en UTC, qui décale d'un jour.
  return new Date(`${value}T00:00:00`)
}

/**
 * La date du jour au format SQL « AAAA-MM-JJ », en heure LOCALE. Jamais `toISOString()`, qui
 * donne le jour UTC : entre minuit et 2 h à Paris, il rend encore la veille.
 */
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** Ramène une date à minuit, pour comparer des jours et non des instants. */
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Le lundi de la semaine en cours, à minuit (la semaine française commence le lundi). */
export function startOfWeek(date: Date): Date {
  const day = startOfDay(date)
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7))
  return day
}

/** Le même jour, `days` jours plus tard (ou plus tôt), à minuit. */
export function addDays(date: Date, days: number): Date {
  const day = startOfDay(date)
  day.setDate(day.getDate() + days)
  return day
}

/** Nombre de jours entiers entre aujourd'hui et une date (négatif si passée). */
export function daysUntil(target: Date, today: Date = new Date()): number {
  const MS_PER_DAY = 86_400_000
  return Math.round((startOfDay(target).getTime() - startOfDay(today).getTime()) / MS_PER_DAY)
}

/** Mois calendaires entiers de `from` à `to` (to ≥ from) : du 15 oct. au 14 mars, 4 mois. */
export function wholeMonthsBetween(from: Date, to: Date): number {
  const months = (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth()
  return to.getDate() < from.getDate() ? months - 1 : months
}

/** « Dans 11 jours », « Demain », « Aujourd'hui ». */
export function formatCountdown(days: number): string {
  if (days <= 0) return "Aujourd'hui"
  if (days === 1) return 'Demain'
  return `Dans ${days} jours`
}

/** « 27 jours » — la forme courte de la liste « À venir ». */
export function formatDaysShort(days: number): string {
  if (days <= 0) return "Aujourd'hui"
  if (days === 1) return '1 jour'
  return `${days} jours`
}

const MONTH_FORMATTER = new Intl.DateTimeFormat('fr-FR', { month: 'long' })
const DAY_MONTH_FORMATTER = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })
const FULL_DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' })
const WEEKDAY_DAY_MONTH_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

/** « Aujourd'hui », « Hier », puis le jour de la semaine : « Lundi ». */
export function dayLabel(date: Date, now: Date): string {
  const days = daysUntil(now, date)
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Hier'
  return capitalize(WEEKDAY_FORMATTER.format(date))
}

/** « mercredi 22 octobre ». */
export function formatWeekdayDayMonth(date: Date): string {
  return WEEKDAY_DAY_MONTH_FORMATTER.format(date)
}

/** « mars » — le nom du mois dans une phrase (« 42 festivals t'attendent après mars »). */
export function monthName(date: Date): string {
  return MONTH_FORMATTER.format(date)
}

/** « Septembre » — le nom du mois, initiale en capitale. */
export function formatMonthLabel(date: Date): string {
  return capitalize(MONTH_FORMATTER.format(date))
}

/** « 25 septembre » — la date affichée sur la carte de prochaine date. */
export function formatDayMonth(date: Date): string {
  return DAY_MONTH_FORMATTER.format(date)
}

const DAY_MONTH_SHORT_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
})

/** « 12 sept. » — la forme brève des listes. */
export function formatDayMonthShort(date: Date): string {
  return DAY_MONTH_SHORT_FORMATTER.format(date)
}

const DAY_FORMATTER = new Intl.DateTimeFormat('fr-FR', { day: 'numeric' })
const MONTH_SHORT_FORMATTER = new Intl.DateTimeFormat('fr-FR', { month: 'short' })

const TIME_FORMATTER = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })

/** « 09:05 » — l'heure d'un message. */
export function formatTime(date: Date): string {
  return TIME_FORMATTER.format(date)
}

/** « 30 oct. », « 25–27 oct. », « 30 oct.–2 nov. » — ou « 25–27 septembre » en toutes lettres. */
export function formatDateRange(start: Date, end: Date, month: 'short' | 'long' = 'short'): string {
  const dayMonth = month === 'long' ? formatDayMonth : formatDayMonthShort
  if (start.toDateString() === end.toDateString()) return dayMonth(start)
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${DAY_FORMATTER.format(start)}–${dayMonth(end)}`
  }
  return `${dayMonth(start)}–${dayMonth(end)}`
}

/** « du 24 au 26 septembre », « du 30 octobre au 2 novembre », « le 4 juillet » : une plage dans
 *  une phrase (« Les Aventuriales reviennent du 24 au 26 septembre »). */
export function formatDateSpan(start: Date, end: Date): string {
  if (start.toDateString() === end.toDateString()) return `le ${formatDayMonth(start)}`
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  const from = sameMonth ? DAY_FORMATTER.format(start) : formatDayMonth(start)
  return `du ${from} au ${formatDayMonth(end)}`
}

/** « Sept. », « Janv. », « Mai » : le mois en abrégé, initiale en capitale. */
export function formatMonthShort(month: Date): string {
  return capitalize(MONTH_SHORT_FORMATTER.format(month))
}

/** « Oct », « Janv », « Août » : l’abréviation de la navigation des mois. */
export function formatMonthAbbr(month: Date): string {
  return formatMonthShort(month).replace('.', '')
}

/** « ’24 » : l'année d'un tampon. */
export function stampYear(date: Date): string {
  return `’${String(date.getFullYear()).slice(2)}`
}

/** « 1 jour », « 3 jours » — les deux bornes comptent. */
export function durationLabel(start: Date, end: Date): string {
  const days = daysUntil(end, start) + 1
  return days <= 1 ? '1 jour' : `${days} jours`
}

/** « Du vendredi 25 au dimanche 27 septembre 2026 », « Le samedi 24 juillet 2027 » : la plage en
 *  toutes lettres, jours de la semaine compris (la carte « L'essentiel » de la fiche). Le mois et
 *  l'année ne se répètent que lorsqu'ils changent. */
export function formatLongRange(start: Date, end: Date): string {
  const weekday = (date: Date) => WEEKDAY_FORMATTER.format(date)
  const year = end.getFullYear()
  if (start.toDateString() === end.toDateString())
    return `Le ${weekday(start)} ${formatDayMonth(start)} ${String(year)}`
  const sameYear = start.getFullYear() === year
  const from = !sameYear
    ? `${formatDayMonth(start)} ${String(start.getFullYear())}`
    : start.getMonth() === end.getMonth()
      ? DAY_FORMATTER.format(start)
      : formatDayMonth(start)
  return `Du ${weekday(start)} ${from} au ${weekday(end)} ${formatDayMonth(end)} ${String(year)}`
}

/** « 28 août 2026 » — la date affichée sur une carte de bilan. */
export function formatFullDate(date: Date): string {
  return FULL_DATE_FORMATTER.format(date)
}

export interface MonthSlot {
  /** Premier jour du mois, à minuit. */
  date: Date
  /** Clé « AAAA-MM », pour regrouper les événements. */
  key: string
  label: string
}

/** Clé de regroupement mensuel d'une date. */
export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** Les N mois à partir du mois courant inclus — l'axe du graphe de saison. */
export function monthsWindow(count: number, from: Date = new Date()): MonthSlot[] {
  const start = new Date(from.getFullYear(), from.getMonth(), 1)
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1)
    return { date, key: monthKey(date), label: formatMonthLabel(date) }
  })
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE

/** « à l'instant », « 12 min », « 2 h », « hier », « 4 j ». */
export function timeAgo(date: Date, now: Date): string {
  const elapsed = now.getTime() - date.getTime()
  if (elapsed < MINUTE) return 'à l’instant'
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} min`
  const days = daysUntil(now, date)
  if (days === 0) return `${Math.floor(elapsed / HOUR)} h`
  if (days === 1) return 'hier'
  return `${days} j`
}

/** Le premier jour du mois, `months` mois après celui d'aujourd'hui : la fin d'une fenêtre. */
export function monthsAhead(today: Date, months: number): Date {
  return new Date(today.getFullYear(), today.getMonth() + months, 1)
}

/**
 * La fin d'un Pro offert : `months` mois après la fin en cours si elle est encore future, sinon
 * après maintenant. Un jour absent du mois d'arrivée tombe sur son dernier jour (31 déc. + 2 mois
 * = 28 fév.), comme l'intervalle SQL de `admin_offrir_mois`.
 */
export function giftEnd(current: string | null, months: number, now: Date): Date {
  const running = current ? new Date(current) : null
  const start = running && running > now ? running : now
  const end = new Date(start)
  end.setDate(1)
  end.setMonth(end.getMonth() + months)
  const lastDay = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate()
  end.setDate(Math.min(start.getDate(), lastDay))
  return end
}

const RECENT_DAYS = 14

/** Ajouté il y a moins de `days` jours (quatorze par défaut) : le badge « Nouveau ». */
export function isRecent(
  createdAt: string,
  today: Date = new Date(),
  days: number = RECENT_DAYS,
): boolean {
  return today.getTime() - new Date(createdAt).getTime() < days * 24 * HOUR
}
