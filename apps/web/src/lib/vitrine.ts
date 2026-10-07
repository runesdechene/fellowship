import type { VitrineLink } from '@/types/database'

/**
 * Colonnes d'`entities` lisibles PUBLIQUEMENT (vitrine, embed). Liste blanche : exclut
 * volontairement tout le bloc facturation/identité (stripe_*, subscription_status,
 * billing_interval, current_period_end, trial_end, discount_*, legal_name, siren,
 * billing_no_siren) qui ne doit JAMAIS partir vers un visiteur. Ces colonnes sont aussi
 * `revoke`-ées à `anon` en DB (défense en profondeur) — donc un `select('*')` anonyme
 * échouerait : toute lecture publique d'entities DOIT passer par cette liste.
 */
export const PUBLIC_ENTITY_COLUMNS =
  'actor_id, type, brand_name, craft_type, bio, website, banner_url, avatar_url, ' +
  'public_slug, city, department, postal_code, created_at, plan, links, verified, ' +
  'banner_position, location, comped_pro_until, is_ambassador'

export interface SeasonEvent {
  id: string
  name: string
  start_date: string
  end_date: string
  city: string
  department?: string
  tags: string[] | null
  image_url?: string | null
  slug?: string | null
}

/** Sépare les événements en à venir (début ≥ now, tri croissant) et passés (tri décroissant). */
export function splitSeason(events: SeasonEvent[], now: Date): { upcoming: SeasonEvent[]; past: SeasonEvent[] } {
  const upcoming = events
    .filter(e => new Date(e.start_date) >= now)
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
  const past = events
    .filter(e => new Date(e.start_date) < now)
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
  return { upcoming, past }
}

/** Hôte affichable d'une URL ; renvoie l'entrée brute si non parsable. */
export function linkHost(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

/** Nom d'icône lucide pour un type de lien de vitrine. */
export function linkTypeIcon(type: VitrineLink['type']): string {
  switch (type) {
    case 'website': return 'Globe'
    case 'shop': return 'ShoppingBag'
    case 'instagram': return 'Instagram'
    case 'facebook': return 'Facebook'
    default: return 'Link'
  }
}

/** Nombre de jours (inclus) entre début et fin ; 1 si fin absente/égale. */
export function eventDurationDays(start: string, end: string | null | undefined): number {
  const s = new Date(start)
  const e = end ? new Date(end) : s
  const ms = e.getTime() - s.getTime()
  return Math.max(1, Math.round(ms / 86400000) + 1)
}

/** Plus petite année de début parmi les événements ; null si vide. */
export function firstSeasonYear(events: SeasonEvent[]): number | null {
  if (events.length === 0) return null
  return Math.min(...events.map(e => new Date(e.start_date).getFullYear()))
}

export interface CompanionRow {
  event_id: string
  actor_id: string
  label: string | null
  avatar_url: string | null
  public_slug: string | null
}

/** Regroupe des lignes (event_id + acteur) en Map<event_id, acteurs[]>. */
export function companionsByEvent(rows: CompanionRow[]): Map<string, CompanionRow[]> {
  const map = new Map<string, CompanionRow[]>()
  for (const r of rows) {
    const arr = map.get(r.event_id) ?? []
    arr.push(r)
    map.set(r.event_id, arr)
  }
  return map
}
