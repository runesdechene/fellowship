/**
 * QUOI     — les prochains festivals de la landing : lesquels, dans quel ordre, avec quelle
 *            pastille (« Populaire », « Nouveau »).
 * POURQUOI — lot 11a (spec 2026-10-14-v2-landing-design.md) : une vitrine se montre avec des
 *            affiches, donc les dates qui en ont passent d'abord ; on les montre ensuite dans
 *            l'ordre du calendrier.
 * ATTENTION — « Populaire » ne va qu'à UNE date, et seulement à partir de POPULAR_MIN inscrits :
 *            en dessous, la pastille mentirait.
 */
import { isRecent, parseSqlDate } from './dates'

export const NEXT_FESTIVALS = 5
export const POPULAR_MIN = 3
/** Combien de dates à venir on lit pour en choisir cinq. */
export const CANDIDATES = 20

export interface LandingEventRow {
  id: string
  name: string
  image_url: string | null
  tags: string[] | null
  start_date: string
  end_date: string
  city: string
  department: string | null
  created_at: string
}

export interface LandingFestival {
  id: string
  name: string
  imageUrl: string | null
  tags: string[] | null
  startDate: Date
  endDate: Date
  place: string
  badge: 'Populaire' | 'Nouveau' | null
}

/** `rows` arrive trié par date de début ; `registered` compte les inscrits par événement. */
export function pickNextFestivals(
  rows: LandingEventRow[],
  registered: ReadonlyMap<string, number>,
  today: Date,
): LandingFestival[] {
  const withPoster = rows.filter((r) => r.image_url)
  const withoutPoster = rows.filter((r) => !r.image_url)
  const picked = [...withPoster, ...withoutPoster]
    .slice(0, NEXT_FESTIVALS)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))

  let popular: string | null = null
  let best = POPULAR_MIN - 1
  for (const r of picked) {
    const count = registered.get(r.id) ?? 0
    if (count > best) {
      best = count
      popular = r.id
    }
  }

  return picked.map((r) => ({
    id: r.id,
    name: r.name,
    imageUrl: r.image_url,
    tags: r.tags,
    startDate: parseSqlDate(r.start_date),
    endDate: parseSqlDate(r.end_date),
    place: r.department ? `${r.city} (${r.department})` : r.city,
    badge: r.id === popular ? 'Populaire' : isRecent(r.created_at, today) ? 'Nouveau' : null,
  }))
}
