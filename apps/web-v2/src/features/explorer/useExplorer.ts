/**
 * QUOI     — charge l'Explorer : à l'accueil, trois rangées (où vont tes amis, ajoutés récemment,
 *            près de chez toi) ; avec une recherche, les festivals, les exposants et les festivals
 *            passés trouvés (« Quand » → Passés : les passés seuls).
 * POURQUOI — un seul chargement par état de l'adresse (?q, ?ou, ?quand, ?categorie), selon le
 *            patron des hooks de données : la fonction rend l'état, l'effet l'applique une fois.
 * ATTENTION — « Près de chez toi » compare le DÉPARTEMENT de l'enseigne : la V2 n'a pas encore de
 *            coordonnées pour l'acteur. Repérer une date, c'est la poser en « Intéressé ».
 */
import { useCallback, useEffect, useState } from 'react'
import { todayIso } from '@/lib/dates'
import {
  countBeyond,
  eventsInWindow,
  searchEvents,
  searchPastEvents,
  toSearchEvent,
  type EventRow,
  type SearchEvent,
  type SearchQuery,
} from '@/lib/event-search'
import { locatePlace } from '@/lib/geocode'
import { FREE_MONTHS, PAST, searchPattern, searchWindow, type Horizon } from '@/lib/explorer'
import { fetchCompanions, fetchFriendsByEvent, type Friend } from '@/lib/friends'
import { must, supabase } from '@/lib/supabase'
import type { ParticipationStatus } from '@/types/database'

/** Connecté : sans borne en Pro, 6 mois en gratuit. */
const horizonOf = (pro: boolean): Horizon => (pro ? null : FREE_MONTHS)

const ROW_LIMIT = 12
const SEARCH_LIMIT = 60
export interface ExploreEvent extends SearchEvent {
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

export interface ExplorerQuery extends SearchQuery {
  /** Les km autour du lieu (?rayon), `null` : le lieu sur le texte seul. */
  rayon: number | null
}

export interface ExplorerData {
  friends: ExploreEvent[]
  friendNames: string[]
  recent: ExploreEvent[]
  near: ExploreEvent[]
  nearLabel: string | null
  results: ExploreEvent[]
  /** Les festivals passés de la recherche, du plus récent au plus ancien. */
  past: ExploreEvent[]
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
  past: [],
  hiddenCount: 0,
  exhibitors: [],
  loading: true,
  error: null,
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
    ...toSearchEvent(row, today),
    friends: friendsByEvent.get(row.id) ?? [],
    myStatus: statusByEvent.get(row.id) ?? null,
  }))
}

async function loadHome(query: ExplorerQuery, viewerId: string, today: Date, pro: boolean) {
  const { from, to } = searchWindow(query.quand, horizonOf(pro), today)
  const [companions, entity, recentRows] = await Promise.all([
    fetchCompanions(viewerId, todayIso(from), todayIso(to), new Set()),
    supabase.from('entities').select('department').eq('actor_id', viewerId).maybeSingle(),
    eventsInWindow(query, today, horizonOf(pro))
      .order('created_at', { ascending: false })
      .limit(ROW_LIMIT),
  ])
  const department = must(entity)?.department ?? null

  const [friendRows, nearRows] = await Promise.all([
    companions.length === 0
      ? Promise.resolve({ data: [], error: null })
      : eventsInWindow(query, today, horizonOf(pro))
          .in(
            'id',
            companions.map((companion) => companion.eventId),
          )
          .order('start_date', { ascending: true })
          .limit(ROW_LIMIT),
    department
      ? eventsInWindow(query, today, horizonOf(pro))
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

  const onlyPast = query.quand === PAST

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

  const [eventRows, pastRows, entityRows, follows] = await Promise.all([
    onlyPast
      ? Promise.resolve({ data: [], error: null })
      : searchEvents(query, today, horizonOf(pro))
          .order('start_date', { ascending: true })
          .limit(SEARCH_LIMIT),
    searchPastEvents(query, today).order('start_date', { ascending: false }).limit(SEARCH_LIMIT),
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
  const [results, past] = await Promise.all([
    enrich(must(eventRows), viewerId, today),
    enrich(must(pastRows), viewerId, today),
  ])
  return { results, past, exhibitors }
}

export function useExplorer(
  query: ExplorerQuery,
  viewerId: string | null | undefined,
  pro: boolean,
) {
  const [state, setState] = useState<ExplorerData>(EMPTY)
  const searching = query.q.trim() !== '' || query.ou.trim() !== '' || query.quand === PAST
  const { q, ou, quand, rayon } = query
  // Une valeur simple en dépendance : la liste `tags` est recréée à chaque rendu de la page.
  const tagKey = query.tags.join('|')

  useEffect(() => {
    if (!viewerId) return
    let cancelled = false
    const tags = tagKey ? tagKey.split('|') : []
    async function run(viewer: string) {
      setState((s) => ({ ...s, loading: true, error: null }))
      let next: ExplorerData
      try {
        const today = new Date()
        // Un lieu que la BAN ne trouve pas garde la recherche sur le texte : jamais un écran vide.
        const center = rayon && ou.trim() ? await locatePlace(ou) : null
        const zone = center && rayon ? { ...center, km: rayon } : null
        const current: ExplorerQuery = { q, ou, quand, tags, rayon, zone }
        const [found, hiddenCount] = await Promise.all([
          searching
            ? loadSearch(current, viewer, today, pro)
            : loadHome(current, viewer, today, pro),
          pro ? Promise.resolve(0) : countBeyond(current, today, FREE_MONTHS),
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
  }, [viewerId, pro, searching, q, ou, quand, rayon, tagKey])

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
          past: swap(s.past),
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
