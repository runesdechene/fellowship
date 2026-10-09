/**
 * QUOI     — charge l'Explorer : à l'accueil, trois rangées (où vont tes amis, ajoutés récemment,
 *            près de chez toi) ; avec une recherche, les festivals et les exposants trouvés.
 * POURQUOI — un seul chargement par état de l'adresse (?q, ?ou, ?quand, ?categorie), selon le
 *            patron des hooks de données : la fonction rend l'état, l'effet l'applique une fois.
 * ATTENTION — « Près de chez toi » compare le DÉPARTEMENT de l'enseigne : la V2 n'a pas encore de
 *            coordonnées pour l'acteur. Repérer une date, c'est la poser en « Intéressé ».
 */
import { useCallback, useEffect, useState } from 'react'
import { isRecent, monthsAhead, parseSqlDate, todayIso } from '@/lib/dates'
import { searchPattern, windowMonths } from '@/lib/explorer'
import { proHorizon } from '@/lib/plan'
import { fetchCompanions, fetchFriendsByEvent, type Friend } from '@/lib/friends'
import { must, supabase } from '@/lib/supabase'
import type { ParticipationStatus } from '@/types/database'

const ROW_LIMIT = 12
const SEARCH_LIMIT = 60
const EVENT_COLUMNS = 'id, name, image_url, start_date, end_date, city, department, created_at'

export interface ExploreEvent {
  id: string
  name: string
  imageUrl: string | null
  startDate: Date
  endDate: Date
  city: string
  department: string
  isNew: boolean
  friends: Friend[]
  myStatus: ParticipationStatus | null
}

export interface Exhibitor {
  actorId: string
  slug: string
  name: string
  avatarUrl: string | null
  craft: string | null
  place: string | null
  following: boolean
}

export interface ExplorerQuery {
  q: string
  ou: string
  quand: string | null
  /** Les deux écritures d'une catégorie dans `events.tags` : son nom et son slug. */
  tag: { name: string; slug: string } | null
}

export interface ExplorerData {
  friends: ExploreEvent[]
  friendNames: string[]
  recent: ExploreEvent[]
  near: ExploreEvent[]
  nearLabel: string | null
  results: ExploreEvent[]
  /** En gratuit : les festivals au-delà des 6 mois que la recherche ne montre pas. */
  hiddenCount: number
  exhibitors: Exhibitor[]
  loading: boolean
  error: string | null
}

const EMPTY: ExplorerData = {
  friends: [],
  friendNames: [],
  recent: [],
  near: [],
  nearLabel: null,
  results: [],
  hiddenCount: 0,
  exhibitors: [],
  loading: true,
  error: null,
}

interface EventRow {
  id: string
  name: string
  image_url: string | null
  start_date: string
  end_date: string
  city: string
  department: string
  created_at: string
}

/** Les amis présents et ma propre position sur chaque date, en deux requêtes pour toutes. */
async function enrich(rows: EventRow[], viewerId: string, today: Date): Promise<ExploreEvent[]> {
  if (rows.length === 0) return []
  const ids = rows.map((row) => row.id)
  const [friendsByEvent, mine] = await Promise.all([
    fetchFriendsByEvent(viewerId, ids),
    supabase
      .from('participations')
      .select('event_id, status')
      .eq('actor_id', viewerId)
      .in('event_id', ids),
  ])
  const statusByEvent = new Map(must(mine).map((row) => [row.event_id, row.status]))
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    imageUrl: row.image_url,
    startDate: parseSqlDate(row.start_date),
    endDate: parseSqlDate(row.end_date),
    city: row.city,
    department: row.department,
    isNew: isRecent(row.created_at, today),
    friends: friendsByEvent.get(row.id) ?? [],
    myStatus: statusByEvent.get(row.id) ?? null,
  }))
}

/** Le socle de toutes les requêtes d'événements : publics, dans la fenêtre, de la catégorie. En
 *  gratuit, la fenêtre s'arrête aux 6 prochains mois (windowMonths). */
function eventsInWindow(query: ExplorerQuery, today: Date, pro: boolean) {
  const end = todayIso(monthsAhead(today, windowMonths(query.quand, pro)))
  let request = supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('is_private', false)
    .gte('end_date', todayIso(today))
    .lt('start_date', end)
  if (query.tag) request = request.overlaps('tags', [query.tag.name, query.tag.slug])
  return request
}

/** En gratuit : combien de festivals de la même recherche attendent au-delà des 6 mois. */
async function countBeyond(query: ExplorerQuery, today: Date): Promise<number> {
  const words = searchPattern(query.q)
  const place = searchPattern(query.ou)
  let request = supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('is_private', false)
    .gte('start_date', todayIso(proHorizon(today)))
    .lt('start_date', todayIso(monthsAhead(today, 12)))
  if (query.tag) request = request.overlaps('tags', [query.tag.name, query.tag.slug])
  if (words)
    request = request.or(`name.ilike.${words},city.ilike.${words},department.ilike.${words}`)
  if (place) request = request.or(`city.ilike.${place},department.ilike.${place}`)
  const { count, error } = await request
  if (error) throw new Error(error.message)
  return count ?? 0
}

async function loadHome(query: ExplorerQuery, viewerId: string, today: Date, pro: boolean) {
  const end = todayIso(monthsAhead(today, windowMonths(query.quand, pro)))
  const [companions, entity, recentRows] = await Promise.all([
    fetchCompanions(viewerId, todayIso(today), end, new Set()),
    supabase.from('entities').select('department').eq('actor_id', viewerId).maybeSingle(),
    eventsInWindow(query, today, pro).order('created_at', { ascending: false }).limit(ROW_LIMIT),
  ])
  const department = must(entity)?.department ?? null

  const [friendRows, nearRows] = await Promise.all([
    companions.length === 0
      ? Promise.resolve({ data: [], error: null })
      : eventsInWindow(query, today, pro)
          .in(
            'id',
            companions.map((companion) => companion.eventId),
          )
          .order('start_date', { ascending: true })
          .limit(ROW_LIMIT),
    department
      ? eventsInWindow(query, today, pro)
          .eq('department', department)
          .order('start_date', { ascending: true })
          .limit(ROW_LIMIT)
      : Promise.resolve({ data: [], error: null }),
  ])

  const [friends, recent, near] = await Promise.all([
    enrich(must(friendRows), viewerId, today),
    enrich(must(recentRows), viewerId, today),
    enrich(must(nearRows), viewerId, today),
  ])
  const friendNames = [
    ...new Set(companions.flatMap((companion) => companion.friends.map((friend) => friend.name))),
  ]
  return { friends, friendNames, recent, near, nearLabel: department }
}

async function loadSearch(query: ExplorerQuery, viewerId: string, today: Date, pro: boolean) {
  const words = searchPattern(query.q)
  const place = searchPattern(query.ou)

  let events = eventsInWindow(query, today, pro)
  if (words) events = events.or(`name.ilike.${words},city.ilike.${words},department.ilike.${words}`)
  if (place) events = events.or(`city.ilike.${place},department.ilike.${place}`)

  let entities = supabase
    .from('entities')
    .select('actor_id, public_slug, brand_name, avatar_url, craft_type, city, department')
    .not('public_slug', 'is', null)
    .neq('actor_id', viewerId)
  if (words)
    entities = entities.or(
      `brand_name.ilike.${words},city.ilike.${words},craft_type.ilike.${words}`,
    )
  if (place) entities = entities.or(`city.ilike.${place},department.ilike.${place}`)

  const [eventRows, entityRows, follows] = await Promise.all([
    events.order('start_date', { ascending: true }).limit(SEARCH_LIMIT),
    words || place
      ? entities.order('brand_name', { ascending: true }).limit(SEARCH_LIMIT)
      : Promise.resolve({ data: [], error: null }),
    supabase.from('follows').select('following_actor').eq('follower_actor', viewerId),
  ])
  const followed = new Set(must(follows).map((row) => row.following_actor))

  const exhibitors = must(entityRows).flatMap((row) =>
    row.public_slug
      ? [
          {
            actorId: row.actor_id,
            slug: row.public_slug,
            name: row.brand_name,
            avatarUrl: row.avatar_url,
            craft: row.craft_type,
            place: row.city ? `${row.city}${row.department ? ` (${row.department})` : ''}` : null,
            following: followed.has(row.actor_id),
          },
        ]
      : [],
  )
  return { results: await enrich(must(eventRows), viewerId, today), exhibitors }
}

export function useExplorer(
  query: ExplorerQuery,
  viewerId: string | null | undefined,
  pro: boolean,
) {
  const [state, setState] = useState<ExplorerData>(EMPTY)
  const searching = query.q.trim() !== '' || query.ou.trim() !== ''
  const { q, ou, quand } = query
  // Des valeurs simples en dépendances : l'objet `tag` est recréé à chaque rendu de la page.
  const tagName = query.tag?.name ?? null
  const tagSlug = query.tag?.slug ?? null

  useEffect(() => {
    if (!viewerId) return
    let cancelled = false
    const tag = tagName !== null && tagSlug !== null ? { name: tagName, slug: tagSlug } : null
    const current: ExplorerQuery = { q, ou, quand, tag }

    async function run(viewer: string) {
      setState((s) => ({ ...s, loading: true, error: null }))
      let next: ExplorerData
      try {
        const today = new Date()
        const [found, hiddenCount] = await Promise.all([
          searching
            ? loadSearch(current, viewer, today, pro)
            : loadHome(current, viewer, today, pro),
          pro ? Promise.resolve(0) : countBeyond(current, today),
        ])
        next = { ...EMPTY, ...found, hiddenCount, loading: false }
      } catch {
        next = { ...EMPTY, loading: false, error: 'L’Explorer n’a pas pu être chargé.' }
      }
      if (cancelled) return
      setState(next)
    }

    void run(viewerId)
    return () => {
      cancelled = true
    }
  }, [viewerId, pro, searching, q, ou, quand, tagName, tagSlug])

  /** Repérer une date (« Intéressé ») ou la retirer. Une date déjà engagée ne se touche pas ici. */
  const toggleMark = useCallback(
    async (event: ExploreEvent) => {
      if (!viewerId || (event.myStatus !== null && event.myStatus !== 'interesse')) return
      const marking = event.myStatus === null
      const apply = (status: ParticipationStatus | null) => {
        const swap = (list: ExploreEvent[]) =>
          list.map((item) => (item.id === event.id ? { ...item, myStatus: status } : item))
        setState((s) => ({
          ...s,
          friends: swap(s.friends),
          recent: swap(s.recent),
          near: swap(s.near),
          results: swap(s.results),
        }))
      }
      apply(marking ? 'interesse' : null)
      const response = marking
        ? await supabase
            .from('participations')
            .upsert(
              { actor_id: viewerId, event_id: event.id, status: 'interesse' },
              { onConflict: 'actor_id,event_id' },
            )
        : await supabase
            .from('participations')
            .delete()
            .eq('actor_id', viewerId)
            .eq('event_id', event.id)
      if (response.error) apply(event.myStatus)
    },
    [viewerId],
  )

  /** Suivre un exposant trouvé, ou ne plus le suivre. */
  const toggleFollow = useCallback(
    async (exhibitor: Exhibitor) => {
      if (!viewerId) return
      const set = (following: boolean) => {
        setState((s) => ({
          ...s,
          exhibitors: s.exhibitors.map((item) =>
            item.actorId === exhibitor.actorId ? { ...item, following } : item,
          ),
        }))
      }
      set(!exhibitor.following)
      const response = exhibitor.following
        ? await supabase
            .from('follows')
            .delete()
            .eq('follower_actor', viewerId)
            .eq('following_actor', exhibitor.actorId)
        : await supabase
            .from('follows')
            .insert({ follower_actor: viewerId, following_actor: exhibitor.actorId })
      if (response.error) set(exhibitor.following)
    },
    [viewerId],
  )

  return { ...state, searching, toggleMark, toggleFollow }
}
