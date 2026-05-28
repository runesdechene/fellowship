import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import {
  sortFeed, rankConvergences, rankSuggestions,
  reviewStars, type FeedItem, type FeedActor, type FeedEventRef,
  type Convergence, type Suggestion,
} from '@/lib/community'

const WINDOW_DAYS = 30
const FEED_LIMIT = 60

interface CommunityData {
  feed: FeedItem[]
  convergences: Convergence[]
  suggestions: Suggestion[]
  loading: boolean
  error: boolean
}

async function loadActors(ids: string[]): Promise<Map<string, FeedActor>> {
  const map = new Map<string, FeedActor>()
  if (ids.length === 0) return map
  const { data } = await supabase
    .from('actor_public')
    .select('actor_id, label, avatar_url, public_slug')
    .in('actor_id', ids)
  for (const a of data ?? []) {
    if (a.actor_id) map.set(a.actor_id, {
      actorId: a.actor_id, label: a.label ?? '—', avatarUrl: a.avatar_url, slug: a.public_slug,
    })
  }
  return map
}

export function useCommunityFeed(enabled = true): CommunityData {
  const { currentActor } = useAuth()
  const [data, setData] = useState<CommunityData>({
    feed: [], convergences: [], suggestions: [], loading: true, error: false,
  })

  useEffect(() => {
    if (!currentActor || !enabled) { setData(d => ({ ...d, loading: false })); return } // eslint-disable-line react-hooks/set-state-in-effect
    let cancelled = false
    const me = currentActor.id
    const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString()
    const today = new Date().toISOString().slice(0, 10)

    async function run() {
      try {
        const { data: follows } = await supabase
          .from('follows').select('following_actor').eq('follower_actor', me)
        const followingIds = [...new Set((follows ?? [])
          .map(f => f.following_actor).filter((x): x is string => !!x))]
        if (followingIds.length === 0) {
          if (!cancelled) setData({ feed: [], convergences: [], suggestions: [], loading: false, error: false })
          return
        }

        const [revRes, partRes, folRes, upcomingRes] = await Promise.all([
          supabase.from('reviews')
            .select('id, actor_id, event_id, affluence, organisation, rentabilite, comment, created_at')
            .in('actor_id', followingIds).gte('created_at', since)
            .order('created_at', { ascending: false }).limit(FEED_LIMIT),
          supabase.from('participations')
            .select('id, actor_id, event_id, status, created_at')
            .in('actor_id', followingIds).gte('created_at', since)
            // 'refuse' = dossier refusé : ne doit jamais s'afficher comme « va à X ».
            .neq('status', 'refuse')
            .order('created_at', { ascending: false }).limit(FEED_LIMIT),
          // RPC SECURITY DEFINER : la RLS `follows` ne laisse pas lire les follows entre tiers.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase.rpc as any)('get_network_follow_activity', { p_actor_id: me, p_since: since }),
          supabase.from('participations')
            .select('actor_id, event_id, events!inner(start_date)')
            .in('actor_id', followingIds).gte('events.start_date', today)
            // Idem pour les convergences : on n'aligne pas les agendas sur un refus.
            .neq('status', 'refuse'),
        ])

        const reviews = revRes.data ?? []
        const parts = partRes.data ?? []
        const fols = (folRes.data ?? []) as Array<{ follow_id: string; src_actor: string; dst_actor: string; occurred_at: string }>
        const upcoming = (upcomingRes.data ?? []) as Array<{ actor_id: string | null; event_id: string }>

        const eventIds = [...new Set([
          ...reviews.map(r => r.event_id), ...parts.map(p => p.event_id), ...upcoming.map(u => u.event_id),
        ])]
        const actorIds = [...new Set([
          ...followingIds,
          ...fols.flatMap(f => [f.src_actor, f.dst_actor]).filter((x): x is string => !!x),
        ])]
        const [eventsRes, actorMap] = await Promise.all([
          eventIds.length
            ? supabase.from('events').select('id, name, city, start_date, end_date, image_url').in('id', eventIds)
            : Promise.resolve({ data: [] as never[] }),
          loadActors(actorIds),
        ])
        const eventMap: Record<string, FeedEventRef> = {}
        for (const e of eventsRes.data ?? []) {
          eventMap[e.id] = { id: e.id, name: e.name, city: e.city, startDate: e.start_date, endDate: e.end_date, imageUrl: e.image_url }
        }
        const unknownActor = (id: string | null): FeedActor =>
          (id && actorMap.get(id)) || { actorId: id ?? '?', label: '—', avatarUrl: null, slug: null }

        const items: FeedItem[] = []
        for (const r of reviews) {
          if (!r.actor_id || !eventMap[r.event_id]) continue
          items.push({
            id: `rev-${r.id}`, kind: 'review', occurredAt: r.created_at,
            actor: unknownActor(r.actor_id), event: eventMap[r.event_id],
            stars: reviewStars(r), comment: r.comment,
          })
        }
        for (const p of parts) {
          if (!p.actor_id || !eventMap[p.event_id]) continue
          items.push({
            id: `part-${p.id}`, kind: 'participation', occurredAt: p.created_at,
            actor: unknownActor(p.actor_id), event: eventMap[p.event_id], status: p.status,
          })
        }
        for (const f of fols) {
          if (!f.src_actor || !f.dst_actor) continue
          items.push({
            id: `fol-${f.follow_id}`, kind: 'follow', occurredAt: f.occurred_at,
            actor: unknownActor(f.src_actor), target: unknownActor(f.dst_actor),
          })
        }

        const convParts = upcoming
          .filter(u => u.actor_id)
          .map(u => ({ eventId: u.event_id, actor: unknownActor(u.actor_id) }))
        const convergences = rankConvergences(convParts, eventMap).slice(0, 5)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: suggRows } = await (supabase.rpc as any)('get_follow_suggestions', { p_actor_id: me })
        const suggList = (suggRows ?? []) as Array<{ suggested_actor: string; shared_followers: number }>
        const suggActors = await loadActors(suggList.map(s => s.suggested_actor))
        const suggestions = rankSuggestions(
          suggList.map(s => ({
            actor: suggActors.get(s.suggested_actor) ?? unknownActor(s.suggested_actor),
            sharedFollowers: Number(s.shared_followers), sharedEvents: 0,
          }))
        ).slice(0, 5)

        if (!cancelled) setData({ feed: sortFeed(items), convergences, suggestions, loading: false, error: false })
      } catch {
        if (!cancelled) setData(d => ({ ...d, loading: false, error: true }))
      }
    }
    run()
    return () => { cancelled = true }
  }, [currentActor, enabled])

  return data
}

export function useNetworkActivityMini(enabled = true): FeedItem[] {
  const { feed } = useCommunityFeed(enabled)
  return feed.slice(0, 3)
}
