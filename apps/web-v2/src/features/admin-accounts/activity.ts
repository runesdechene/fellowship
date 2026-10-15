/**
 * QUOI     — la ligne d'activité d'un compte : « 14 dates · 6 avis ».
 * POURQUOI — la liste des enseignes et celle des personnes la disent pareil ; un zéro s'omet.
 */
export function activityLabel(dates: number, reviews: number): string {
  const parts = [
    dates > 0 ? `${dates} ${dates === 1 ? 'date' : 'dates'}` : '',
    reviews > 0 ? `${reviews} avis` : '',
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : '—'
}
