/**
 * QUOI     — la logique pure de la vitrine d'un artisan : couper sa route entre à venir et passé,
 *            nommer les tampons, accorder le réseau,
 *            les initiales du logo et l'hôte du site.
 * POURQUOI — la vitrine ne fait qu'afficher ; ses libellés se testent seuls (vitrine.test.ts).
 * ATTENTION — une date en cours est encore « à venir » : on la quitte le lendemain de sa fin.
 */

/** « Les Aventuriales » → « Aventuriales » ; « Art to Play 2026 » → « Art to Play ». */
export function stampName(name: string): string {
  return name
    .replace(/^(les|la|le)\s+/i, '')
    .replace(/^l['’]/i, '')
    .replace(/\s*[-–·]?\s*(19|20)\d{2}\b.*$/, '')
    .trim()
}

interface Count {
  count: number
  label: string
}

/** « 128 abonnés », « 14 compagnons exposants » — au singulier jusqu'à un. */
export function networkCounts(followers: number, companions: number): [Count, Count] {
  return [
    { count: followers, label: followers > 1 ? 'abonnés' : 'abonné' },
    { count: companions, label: companions > 1 ? 'compagnons exposants' : 'compagnon exposant' },
  ]
}

/** Les prochaines escales, du plus proche au plus loin ; la route passée, du plus récent. */
export function splitRoad<T extends { startDate: Date; endDate: Date }>(
  items: T[],
  today: Date,
): { upcoming: T[]; past: T[] } {
  const upcoming = items
    .filter((item) => item.endDate >= today)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  const past = items
    .filter((item) => item.endDate < today)
    .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
  return { upcoming, past }
}

/** « AC » pour « Atelier Corne & Cuir » : le repli du logo. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((word) => /\p{L}/u.test(word))
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
}

/** L'adresse du site, cliquable, et ce qu'on en affiche : l'hôte nu. */
export function websiteLink(raw: string): { href: string; label: string } {
  const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    return { href, label: new URL(href).hostname.replace(/^www\./, '') }
  } catch {
    return { href, label: raw }
  }
}
