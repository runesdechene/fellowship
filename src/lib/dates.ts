/* -----------------------------------------------------------------------------
   Dates — toute la logique calendaire de la V2 vit ici, et nulle part ailleurs.
   Les dates de la base sont des DATE Postgres (« 2026-09-25 »), sans fuseau :
   on les manipule en local pour éviter le décalage d'un jour.
   -------------------------------------------------------------------------- */

/** Convertit une date SQL « AAAA-MM-JJ » en Date locale à minuit. */
export function parseSqlDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Ramène une date à minuit, pour comparer des jours et non des instants. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Nombre de jours entiers entre aujourd'hui et une date (négatif si passée). */
export function daysUntil(target: Date, today: Date = new Date()): number {
  const MS_PER_DAY = 86_400_000
  return Math.round((startOfDay(target).getTime() - startOfDay(today).getTime()) / MS_PER_DAY)
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

/** « Septembre » — le nom du mois, initiale en capitale. */
export function formatMonthLabel(date: Date): string {
  return capitalize(MONTH_FORMATTER.format(date))
}

/** « 25 septembre » — la date affichée sur la carte de prochaine date. */
export function formatDayMonth(date: Date): string {
  return DAY_MONTH_FORMATTER.format(date)
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
