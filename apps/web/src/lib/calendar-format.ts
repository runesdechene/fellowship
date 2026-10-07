/** Formate une plage de dates en français court pour le calendrier.
 *  Même jour → "24 mai" ; même mois → "24-26 mai" ; deux mois → "30 mai — 2 juin". */
export function formatDateRange(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth()
  const sameDay = start.getDate() === end.getDate() && sameMonth
  const monthShort = start.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')

  if (sameDay) return `${start.getDate()} ${monthShort}`
  if (sameMonth) return `${start.getDate()}-${end.getDate()} ${monthShort}`
  const endMonth = end.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
  return `${start.getDate()} ${monthShort} — ${end.getDate()} ${endMonth}`
}
