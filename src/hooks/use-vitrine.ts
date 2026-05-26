import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { EntityRow, EntityGalleryRow } from '@/types/database'
import type { NetworkMember } from '@/lib/profile-network'
import type { SeasonEvent } from '@/lib/vitrine'

export interface VitrineData {
  entity: EntityRow | null
  gallery: EntityGalleryRow[]
  season: SeasonEvent[]
  friends: NetworkMember[]
  followers: NetworkMember[]
  loading: boolean
  notFound: boolean
}

export function useVitrine(slug: string | undefined): VitrineData {
  const [data, setData] = useState<VitrineData>({
    entity: null, gallery: [], season: [], friends: [], followers: [],
    loading: true, notFound: false,
  })

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    async function run() {
      let entity: EntityRow | null = null
      const { data: bySlug } = await supabase.from('entities').select('*').eq('public_slug', slug!).single()
      if (bySlug) entity = bySlug as EntityRow
      else {
        const { data: byId } = await supabase.from('entities').select('*').eq('actor_id', slug!).single()
        entity = (byId as EntityRow) ?? null
      }
      if (!entity) {
        if (!cancelled) setData(d => ({ ...d, loading: false, notFound: true }))
        return
      }

      const { data: gal } = await supabase
        .from('entity_gallery').select('*')
        .eq('entity_actor_id', entity.actor_id)
        .order('position', { ascending: true })

      const { data: parts } = await supabase
        .from('participations')
        .select('events(id, name, start_date, end_date, city, department, tags, image_url)')
        .eq('actor_id', entity.actor_id).eq('status', 'inscrit')
      const season = ((parts ?? []) as Array<{ events: SeasonEvent | null }>)
        .map(p => p.events).filter((e): e is SeasonEvent => !!e)

      const { friends, followers } = await fetchNetwork(entity.actor_id)

      if (!cancelled) setData({
        entity, gallery: (gal as EntityGalleryRow[] | null) ?? [], season,
        friends, followers, loading: false, notFound: false,
      })
    }
    run()
    return () => { cancelled = true }
  }, [slug])

  return data
}

async function fetchNetwork(actorId: string): Promise<{ friends: NetworkMember[]; followers: NetworkMember[] }> {
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

    const { data: links } = await supabase.from('follows')
      .select('created_at, follower_actor').eq('following_actor', actorId).order('created_at', { ascending: false })
    type FollowerLink = { created_at: string; follower_actor: string | null }
    const fl = (links as FollowerLink[] | null) ?? []
    const ids = fl.map(l => l.follower_actor).filter((id): id is string => !!id)
    let followers: NetworkMember[] = []
    if (ids.length) {
      const { data: actors } = await supabase.from('actor_public')
        .select('actor_id, label, avatar_url, public_slug').in('actor_id', ids)
      const dm = new Map(fl.map(l => [l.follower_actor ?? '', l.created_at]))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      followers = ((actors ?? []) as any[]).map(a => toMember(a, dm.get(a.actor_id ?? '') ?? new Date(0).toISOString()))
    }
    return { friends, followers }
  } catch { return { friends: [], followers: [] } }
}
