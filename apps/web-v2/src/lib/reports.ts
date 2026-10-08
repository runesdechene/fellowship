/**
 * QUOI     — la logique des bilans : quand un bilan est rempli, les chiffres d'une date, le
 *            résumé d'une année (bénéfice, chiffre d'affaires, frais, meilleure date, mois).
 * POURQUOI — Mes bilans, le bilan d'une date et le tableau de bord lisent la même règle.
 * ATTENTION — un bilan est REMPLI quand il a une ligne saisie dans le bilan (source 'manual') :
 *            la ligne de Mon dossier (source 'stepper') existe souvent avant la date, et la
 *            ligne event_reports aussi (set_stand_amount la crée). Ni l'une ni l'autre ne disent
 *            que l'exposant a fait son bilan.
 */
import { daysUntil } from './dates'
import { ledgerProfit, ledgerRevenue, type LedgerLine } from './money'

export interface ReportLine extends LedgerLine {
  source: string
}

/** Une date passée où l'acteur était inscrit, avec les lignes de son bilan. */
export interface ReportDate {
  eventId: string
  name: string
  imageUrl: string | null
  /** « Ménétrole (63) ». */
  place: string
  startDate: Date
  endDate: Date
  lines: ReportLine[]
}

export interface ReportFigures {
  filled: boolean
  revenue: number
  costs: number
  net: number
  days: number
}

export interface YearSummary {
  net: number
  revenue: number
  costs: number
  filledCount: number
  best: ReportDate | null
  bestNet: number
  bestDays: number
  /** Variation du chiffre d'affaires sur l'année précédente, en %. null sans point de comparaison. */
  revenueChange: number | null
  /** Bénéfice de chaque mois, de janvier (0) à décembre (11), au mois de DÉBUT de la date. */
  months: number[]
}

export function isFilled(lines: ReportLine[]): boolean {
  return lines.some((line) => line.source === 'manual')
}

export function reportFigures(date: ReportDate): ReportFigures {
  const revenue = ledgerRevenue(date.lines)
  const net = ledgerProfit(date.lines)
  return {
    filled: isFilled(date.lines),
    revenue,
    costs: revenue - net,
    net,
    days: daysUntil(date.endDate, date.startDate) + 1,
  }
}

export function yearSummary(dates: ReportDate[], previousYearRevenue: number | null): YearSummary {
  const months = Array<number>(12).fill(0)
  let net = 0
  let revenue = 0
  let filledCount = 0
  let best: ReportDate | null = null
  let bestNet = 0
  let bestDays = 0

  // Du plus récent au plus ancien : à égalité, la première trouvée — la plus récente — reste.
  const newestFirst = [...dates].sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
  for (const date of newestFirst) {
    const figures = reportFigures(date)
    if (!figures.filled) continue
    filledCount += 1
    net += figures.net
    revenue += figures.revenue
    const month = date.startDate.getMonth()
    months[month] = (months[month] ?? 0) + figures.net
    if (best === null || figures.net > bestNet) {
      best = date
      bestNet = figures.net
      bestDays = figures.days
    }
  }

  const revenueChange =
    previousYearRevenue && previousYearRevenue > 0
      ? Math.round(((revenue - previousYearRevenue) / previousYearRevenue) * 100)
      : null

  return {
    net,
    revenue,
    costs: revenue - net,
    filledCount,
    best,
    bestNet,
    bestDays,
    revenueChange,
    months,
  }
}

/** Le mois mis en avant dans le graphique : celui du plus grand bénéfice positif. */
export function bestMonth(months: number[]): number | null {
  let index: number | null = null
  let top = 0
  months.forEach((value, month) => {
    if (value > top) {
      index = month
      top = value
    }
  })
  return index
}
