/**
 * QUOI     — les phrases de la création d'une date : la ligne d'un doublon (dates, lieu, inscrits ou
 *            « Passé »), le lieu et les dates de l'aperçu.
 * POURQUOI — lot 10b, maquette 2082:2. Les dates passent par lib/dates.ts, jamais recalculées.
 */
import { formatDateRange, parseSqlDate, todayIso } from './dates'

function place(city: string, department: string): string {
  return department.trim() ? `${city.trim()} (${department.trim()})` : city.trim()
}

function dates(startDate: string, endDate: string): string {
  return formatDateRange(parseSqlDate(startDate), parseSqlDate(endDate || startDate))
}

export function duplicateLine(
  row: { startDate: string; endDate: string; city: string; department: string; exhibitors: number },
  today: Date,
): { meta: string; past: boolean } {
  const past = (row.endDate || row.startDate) < todayIso(today)
  const parts = [dates(row.startDate, row.endDate), place(row.city, row.department)]
  if (past) parts.push('Passé')
  else if (row.exhibitors > 0)
    parts.push(
      `${String(row.exhibitors)} exposant${row.exhibitors > 1 ? 's' : ''} inscrit${row.exhibitors > 1 ? 's' : ''}`,
    )
  return { meta: parts.join(' · '), past }
}

export function previewPlace(draft: {
  startDate: string
  endDate: string
  city: string
  department: string
}): string | null {
  if (!draft.startDate || !draft.city.trim()) return null
  return `${dates(draft.startDate, draft.endDate)} · ${place(draft.city, draft.department)}`
}
