/**
 * QUOI     — la recherche de festivals publics, sans acteur : la requête d'une fenêtre (catégories
 *            comprises), ses mots et son lieu, le compte de ce qui attend au-delà de l'horizon.
 * POURQUOI — l'Explorer connecté et la recherche publique (lot 11b) cherchent pareil ; seuls
 *            l'horizon et ce qu'on ajoute autour (amis, statut) changent.
 * ATTENTION — seules les fiches publiques : `is_private = false` dans chaque requête.
 */
import { isRecent, parseSqlDate, todayIso } from './dates'
import { beyondWindow, searchPattern, searchWindow, type Horizon } from './explorer'
import { supabase } from './supabase'

export const EVENT_COLUMNS =
  'id, name, image_url, tags, start_date, end_date, city, department, created_at'

export interface SearchQuery {
  q: string
  ou: string
  quand: string | null
  /** Les écritures des catégories retenues dans `events.tags` (nom et slug de chacune) ; une
   *  date en porte au moins une. Vide : toutes les catégories. */
  tags: string[]
  /** Le cercle autour du lieu quand la recherche porte un rayon (?rayon) ; il remplace alors la
   *  correspondance du lieu sur le texte de la ville et du département. */
  zone?: Zone | null
}

export interface Zone {
  latitude: number
  longitude: number
  km: number
}

export interface EventRow {
  id: string
  name: string
  image_url: string | null
  tags: string[] | null
  start_date: string
  end_date: string
  city: string
  department: string
  created_at: string
}

export interface SearchEvent {
  id: string
  name: string
  imageUrl: string | null
  tags: string[] | null
  startDate: Date
  endDate: Date
  city: string
  department: string
  isNew: boolean
}

export function toSearchEvent(row: EventRow, today: Date): SearchEvent {
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.image_url,
    tags: row.tags,
    startDate: parseSqlDate(row.start_date),
    endDate: parseSqlDate(row.end_date),
    city: row.city,
    department: row.department,
    isNew: isRecent(row.created_at, today),
  }
}

/** Les arguments de `events_within` : les fiches à moins de `km` du centre, à vol d'oiseau. */
const zoneArgs = (zone: Zone) => ({ p_lat: zone.latitude, p_lng: zone.longitude, p_km: zone.km })

/** Le lieu sur le texte (ville, département), sauf quand un cercle l'a déjà pris en charge. */
const placeOf = (query: SearchQuery) => (query.zone ? null : searchPattern(query.ou))

/** Le socle de toutes les requêtes d'événements : publics, dans la fenêtre, de la catégorie. Le
 *  total (`count`) sert à la recherche publique ; l'Explorer l'ignore. */
export function eventsInWindow(query: SearchQuery, today: Date, horizon: Horizon) {
  const { from, to } = searchWindow(query.quand, horizon, today)
  let request = (
    query.zone
      ? supabase.rpc('events_within', zoneArgs(query.zone), { count: 'exact' }).select(EVENT_COLUMNS)
      : supabase.from('events').select(EVENT_COLUMNS, { count: 'exact' })
  )
    .eq('is_private', false)
    .gte('end_date', todayIso(from))
    .lt('start_date', todayIso(to))
  if (query.tags.length > 0) request = request.overlaps('tags', query.tags)
  return request
}

/** La fenêtre, plus les mots (nom, ville, département) et le lieu (ville, département, ou cercle). */
export function searchEvents(query: SearchQuery, today: Date, horizon: Horizon) {
  const words = searchPattern(query.q)
  const place = placeOf(query)
  let request = eventsInWindow(query, today, horizon)
  if (words)
    request = request.or(`name.ilike.${words},city.ilike.${words},department.ilike.${words}`)
  if (place) request = request.or(`city.ilike.${place},department.ilike.${place}`)
  return request
}

/** Combien de festivals de la même recherche attendent au-delà de l'horizon. */
export async function countBeyond(
  query: SearchQuery,
  today: Date,
  horizon: number,
): Promise<number> {
  const beyond = beyondWindow(query.quand, today, horizon)
  if (!beyond) return 0
  const words = searchPattern(query.q)
  const place = placeOf(query)
  let request = (
    query.zone
      ? supabase
          .rpc('events_within', zoneArgs(query.zone), { count: 'exact', head: true })
          .select('id')
      : supabase.from('events').select('id', { count: 'exact', head: true })
  )
    .eq('is_private', false)
    .gte('start_date', todayIso(beyond.from))
    .lt('start_date', todayIso(beyond.to))
  if (query.tags.length > 0) request = request.overlaps('tags', query.tags)
  if (words)
    request = request.or(`name.ilike.${words},city.ilike.${words},department.ilike.${words}`)
  if (place) request = request.or(`city.ilike.${place},department.ilike.${place}`)
  const { count, error } = await request
  if (error) throw new Error(error.message)
  return count ?? 0
}
