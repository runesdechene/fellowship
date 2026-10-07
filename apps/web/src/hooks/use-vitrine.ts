import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { EntityRow } from '@/types/database'
import type { NetworkMember } from '@/lib/profile-network'
import { PUBLIC_ENTITY_COLUMNS, type SeasonEvent } from '@/lib/vitrine'

export interface VitrineData {
  entity: EntityRow | null
  season: SeasonEvent[]
  friends: NetworkMember[]
  followers: NetworkMember[]
  following: NetworkMember[]
  loading: boolean
  notFound: boolean
}

export function useVitrine(slug: string | undefined): VitrineData {
  const [data, setData] = useState<VitrineData>({
    entity: null, season: [], friends: [], followers: [], following: [],
    loading: true, notFound: false,
  })

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    // Reset complet entre slugs : sinon naviguer de /@alice à /@bob laissait
    // Alice (entité, network, season) visible pendant le refetch — pire, un
    // 404 résiduel pouvait collisionner avec une entité valide à charger.
    setData({ entity: null, season: [], friends: [], followers: [], following: [], loading: true, notFound: false }) // eslint-disable-line react-hooks/set-state-in-effect
    async function run() {
      let entity: EntityRow | null = null
      const { data: bySlug } = await supabase.from('entities').select(PUBLIC_ENTITY_COLUMNS).eq('public_slug', slug!).maybeSingle()
      if (bySlug) entity = bySlug as unknown as EntityRow
      else {
        const { data: byId } = await supabase.from('entities').select(PUBLIC_ENTITY_COLUMNS).eq('actor_id', slug!).maybeSingle()
        entity = (byId as unknown as EntityRow) ?? null
      }
      if (!entity) {
        if (!cancelled) setData(d => ({ ...d, loading: false, notFound: true }))
        return
      }

      const { data: parts } = await supabase
        .from('participations')
        .select('events(id, name, start_date, end_date, city, department, tags, image_url, slug, is_private)')
        // « Accepté » = on y va (présence acquise), payé ou pas. `confirme` inclus par robustesse.
        .eq('actor_id', entity.actor_id).in('status', ['inscrit', 'confirme'])
      const season = ((parts ?? []) as Array<{ events: (SeasonEvent & { is_private?: boolean }) | null }>)
        .map(p => p.events)
        .filter((e): e is SeasonEvent & { is_private?: boolean } => !!e && !e.is_private)

      const { friends, followers, following } = await fetchNetwork(entity.actor_id)

      if (!cancelled) setData({
        entity, season,
        friends, followers, following, loading: false, notFound: false,
      })
    }
    run()
    return () => { cancelled = true }
  }, [slug])

  return data
}

async function fetchNetwork(actorId: string): Promise<{ friends: NetworkMember[]; followers: NetworkMember[]; following: NetworkMember[] }> {
  const toMember = (
    a: { actor_id: string | null; label: string | null; avatar_url: string | null; public_slug: string | null },
    joinedAt: string,
  ): NetworkMember => ({
    id: a.actor_id ?? '',
    display_name: null,
    brand_name: a.label,
    avatar_url: a.avatar_url,
    public_slug: a.public_slug,
    craft_type: null,
    city: null,
    joinedAt,
  })
  try {
    type FriendRow = { friend_id: string; friended_at: string }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: friendRows } = await (supabase.rpc as any)('get_friends_with_dates', { p_user_id: actorId })
    const friendDates = (friendRows as FriendRow[] | null) ?? []
    let friends: NetworkMember[] = []
    if (friendDates.length) {
      const { data: actors } = await supabase.from('actor_public')
        .select('actor_id, label, avatar_url, public_slug').in('actor_id', friendDates.map(f => f.friend_id))
      const dm = new Map(friendDates.map(f => [f.friend_id, f.friended_at]))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      friends = ((actors ?? []) as any[]).map(a => toMember(a, dm.get(a.actor_id ?? '') ?? new Date(0).toISOString()))
    }

    // Abonnés via RPC SECURITY DEFINER : la RLS `follows_select` ne laisse un tiers
    // lire que les follows dont il est partie prenante. Une lecture directe ici
    // renvoyait donc une liste quasi vide (compteur faux) à tout visiteur non-membre.
    // get_followers_with_dates contourne la RLS de façon bornée (= preuve sociale publique).
    type FollowerRow = { follower_id: string; followed_at: string }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: followerRows } = await (supabase.rpc as any)('get_followers_with_dates', { p_actor_id: actorId })
    const followerDates = (followerRows as FollowerRow[] | null) ?? []
    let followers: NetworkMember[] = []
    if (followerDates.length) {
      const { data: actors } = await supabase.from('actor_public')
        .select('actor_id, label, avatar_url, public_slug').in('actor_id', followerDates.map(f => f.follower_id))
      const dm = new Map(followerDates.map(f => [f.follower_id, f.followed_at]))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      followers = ((actors ?? []) as any[]).map(a => toMember(a, dm.get(a.actor_id ?? '') ?? new Date(0).toISOString()))
    }

    // Abonnements (qui CET acteur suit) — onglet « Abonnements ». Même rail RPC
    // SECURITY DEFINER que les abonnés : la lecture directe serait filtrée par la RLS.
    type FollowingRow = { following_id: string; followed_at: string }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: followingRows } = await (supabase.rpc as any)('get_following_with_dates', { p_actor_id: actorId })
    const followingDates = (followingRows as FollowingRow[] | null) ?? []
    let following: NetworkMember[] = []
    if (followingDates.length) {
      const { data: actors } = await supabase.from('actor_public')
        .select('actor_id, label, avatar_url, public_slug').in('actor_id', followingDates.map(f => f.following_id))
      const dm = new Map(followingDates.map(f => [f.following_id, f.followed_at]))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      following = ((actors ?? []) as any[]).map(a => toMember(a, dm.get(a.actor_id ?? '') ?? new Date(0).toISOString()))
    }

    return { friends, followers, following }
  } catch { return { friends: [], followers: [], following: [] } }
}
