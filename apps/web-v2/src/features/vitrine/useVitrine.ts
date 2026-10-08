/**
 * QUOI     — charge la vitrine d'un artisan par son adresse publique : son identité, son réseau,
 *            ses prochaines escales (avec les amis du visiteur qui y vont) et sa route passée.
 * POURQUOI — un seul chargement pour tout l'écran, suivant le patron des hooks de données : la
 *            fonction rend l'état, l'effet l'applique une fois.
 * ATTENTION — la vitrine ne montre que les dates acquises (inscrit, confirmé) et jamais un
 *            événement privé. Les abonnés passent par une fonction de la base : la RLS de `follows`
 *            ne laisse un tiers lire que ses propres abonnements.
 */
import { useCallback, useEffect, useState } from 'react'
import { daysUntil, parseSqlDate } from '@/lib/dates'
import {
  CONFIRMED_STATUSES,
  fetchActorProfiles,
  fetchFriendsByEvent,
  type Friend,
} from '@/lib/friends'
import { must, supabase } from '@/lib/supabase'
import { isCertified } from '@/lib/plan'
import { splitRoad } from '@/lib/vitrine'

/** Les colonnes publiques d'une enseigne — jamais la facturation. */
const PUBLIC_COLUMNS =
  'actor_id, brand_name, craft_type, bio, website, banner_url, banner_position, avatar_url, public_slug, city, department, plan, verified, comped_pro_until, is_ambassador'

const MAX_FOLLOWER_FACES = 3

export interface VitrineDate {
  eventId: string
  name: string
  city: string
  department: string
  imageUrl: string | null
  startDate: Date
  endDate: Date
  daysAway: number
  /** Les amis du visiteur qui y vont — jamais l'artisan lui-même. */
  friends: Friend[]
}

export interface Vitrine {
  actorId: string
  slug: string
  name: string
  craft: string | null
  bio: string | null
  website: string | null
  bannerUrl: string | null
  bannerPosition: number
  avatarUrl: string | null
  place: string | null
  certified: boolean
  ambassador: boolean
  followerCount: number
  followerFaces: Friend[]
  companionCount: number
  following: boolean
  upcoming: VitrineDate[]
  past: VitrineDate[]
}

export interface VitrineState {
  vitrine: Vitrine | null
  loading: boolean
  notFound: boolean
  error: string | null
}

/** Combien de ces acteurs tiennent une enseigne. */
async function countEntities(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0
  const response = await supabase
    .from('entities')
    .select('actor_id', { count: 'exact', head: true })
    .in('actor_id', ids)
  if (response.error) throw new Error(response.error.message)
  return response.count ?? 0
}

async function loadVitrine(slug: string, viewerId: string, today: Date): Promise<Vitrine | null> {
  const entityResponse = await supabase
    .from('entities')
    .select(PUBLIC_COLUMNS)
    .eq('public_slug', slug)
    .maybeSingle()
  const entity = must(entityResponse)
  if (!entity) return null
  const id = entity.actor_id

  const [participations, followers, friendIds, myFollow] = await Promise.all([
    supabase
      .from('participations')
      .select('event_id, events!inner(name, start_date, end_date, city, department, image_url)')
      .eq('actor_id', id)
      .in('status', CONFIRMED_STATUSES)
      .eq('events.is_private', false),
    supabase.rpc('get_followers_with_dates', { p_actor_id: id }),
    supabase.rpc('get_friend_ids', { p_user_id: id }),
    supabase
      .from('follows')
      .select('id')
      .eq('follower_actor', viewerId)
      .eq('following_actor', id)
      .maybeSingle(),
  ])

  const followerRows = must(followers)
  const companions = must(friendIds)
  const dates = must(participations).map((row) => {
    const startDate = parseSqlDate(row.events.start_date)
    return {
      eventId: row.event_id,
      name: row.events.name,
      city: row.events.city,
      department: row.events.department,
      imageUrl: row.events.image_url,
      startDate,
      endDate: parseSqlDate(row.events.end_date),
      daysAway: daysUntil(startDate, today),
      friends: [] as Friend[],
    }
  })
  const { upcoming, past } = splitRoad(dates, today)

  // Les compagnons « exposants » sont les amis qui tiennent une enseigne, pas les personnes.
  const [faces, companionEntities, friendsByEvent] = await Promise.all([
    fetchActorProfiles(followerRows.slice(0, MAX_FOLLOWER_FACES).map((r) => r.follower_id)),
    countEntities(companions),
    fetchFriendsByEvent(
      viewerId,
      upcoming.map((date) => date.eventId),
    ),
  ])

  return {
    actorId: id,
    slug,
    name: entity.brand_name,
    craft: entity.craft_type,
    bio: entity.bio,
    website: entity.website,
    bannerUrl: entity.banner_url,
    bannerPosition: entity.banner_position,
    avatarUrl: entity.avatar_url,
    place: entity.city
      ? `${entity.city}${entity.department ? ` (${entity.department})` : ''}`
      : null,
    // Même règle que partout (lib/plan.ts) : le Pro offert par le parrainage compte aussi.
    certified: isCertified(entity, new Date()),
    ambassador: entity.is_ambassador,
    followerCount: followerRows.length,
    followerFaces: [...faces.values()],
    companionCount: companionEntities,
    following: must(myFollow) !== null,
    upcoming: upcoming.map((date) => ({
      ...date,
      friends: (friendsByEvent.get(date.eventId) ?? []).filter((f) => f.id !== id),
    })),
    past,
  }
}

const EMPTY: VitrineState = { vitrine: null, loading: true, notFound: false, error: null }

export function useVitrine(slug: string | undefined, viewerId: string | null | undefined) {
  const [state, setState] = useState<VitrineState>(EMPTY)

  useEffect(() => {
    if (!slug || !viewerId) return
    let cancelled = false

    async function run(currentSlug: string, currentViewer: string) {
      setState(EMPTY)
      let next: VitrineState
      try {
        const vitrine = await loadVitrine(currentSlug, currentViewer, new Date())
        next = { vitrine, loading: false, notFound: vitrine === null, error: null }
      } catch {
        next = { ...EMPTY, loading: false, error: 'Cette vitrine n’a pas pu être chargée.' }
      }
      if (cancelled) return
      setState(next)
    }

    void run(slug, viewerId)
    return () => {
      cancelled = true
    }
  }, [slug, viewerId])

  /** Suivre ou ne plus suivre : l'état bascule tout de suite et revient si la base refuse. */
  const toggleFollow = useCallback(async () => {
    const vitrine = state.vitrine
    if (!vitrine || !viewerId) return
    const wasFollowing = vitrine.following
    const flip = (following: boolean, delta: number) => {
      setState((s) =>
        s.vitrine
          ? {
              ...s,
              vitrine: { ...s.vitrine, following, followerCount: s.vitrine.followerCount + delta },
            }
          : s,
      )
    }
    flip(!wasFollowing, wasFollowing ? -1 : 1)
    const response = wasFollowing
      ? await supabase
          .from('follows')
          .delete()
          .eq('follower_actor', viewerId)
          .eq('following_actor', vitrine.actorId)
      : await supabase
          .from('follows')
          .insert({ follower_actor: viewerId, following_actor: vitrine.actorId })
    if (response.error) flip(wasFollowing, wasFollowing ? 1 : -1)
  }, [state.vitrine, viewerId])

  return { ...state, toggleFollow }
}
