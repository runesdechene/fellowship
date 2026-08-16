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

/** Variante avec année, pour les listes qui traversent plusieurs saisons (ex :
 *  festivals passés dans Mes bilans) où deux éditions du même festival, sans
 *  année, produisent littéralement la même ligne. Enveloppe `formatDateRange`
 *  plutôt que de réinventer un format ; ajoute l'année de fin (couvre aussi
 *  le cas d'une plage à cheval sur le nouvel an). */
export function formatDateRangeWithYear(start: Date, end: Date): string {
  return `${formatDateRange(start, end)} ${end.getFullYear()}`
}
