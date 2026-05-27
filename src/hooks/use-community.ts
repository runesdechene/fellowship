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

export function useCommunityFeed(): CommunityData {
  const { currentActor } = useAuth()
  const [data, setData] = useState<CommunityData>({
    feed: [], convergences: [], suggestions: [], loading: true, error: false,
  })

  useEffect(() => {
    if (!currentActor) { setData(d => ({ ...d, loading: false })); return } // eslint-disable-line react-hooks/set-state-in-effect
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
            .order('created_at', { ascending: false }).limit(FEED_LIMIT),
          supabase.from('follows')
            .select('id, follower_actor, following_actor, created_at')
            .in('follower_actor', followingIds).gte('created_at', since)
            .order('created_at', { ascending: false }).limit(FEED_LIMIT),
          supabase.from('participations')
            .select('actor_id, event_id, events!inner(start_date)')
            .in('actor_id', followingIds).gte('events.start_date', today),
        ])

        const reviews = revRes.data ?? []
        const parts = partRes.data ?? []
        const fols = folRes.data ?? []
        const upcoming = (upcomingRes.data ?? []) as Array<{ actor_id: string | null; event_id: string }>

        const eventIds = [...new Set([
          ...reviews.map(r => r.event_id), ...parts.map(p => p.event_id), ...upcoming.map(u => u.event_id),
        ])]
        const actorIds = [...new Set([
          ...followingIds,
          ...fols.map(f => f.following_actor).filter((x): x is string => !!x),
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
          if (!f.follower_actor || !f.following_actor) continue
          items.push({
            id: `fol-${f.id}`, kind: 'follow', occurredAt: f.created_at,
            actor: unknownActor(f.follower_actor), target: unknownActor(f.following_actor),
          })
        }

        const convParts = upcoming
          .filter(u => u.actor_id)
          .map(u => ({ eventId: u.event_id, actor: unknownActor(u.actor_id) }))
        const convergences = rankConvergences(convParts, eventMap).slice(0, 5)

        const { data: secondDegree } = await supabase
          .from('follows').select('following_actor').in('follower_actor', followingIds)
        const counts = new Map<string, number>()
        for (const s of secondDegree ?? []) {
          const id = s.following_actor
          if (!id || id === me || followingIds.includes(id)) continue
          counts.set(id, (counts.get(id) ?? 0) + 1)
        }
        const suggIds = [...counts.keys()].slice(0, 12)
        const suggActors = await loadActors(suggIds)
        const suggestions = rankSuggestions(
          suggIds.map(id => ({
            actor: suggActors.get(id) ?? unknownActor(id),
            sharedFollowers: counts.get(id) ?? 0, sharedEvents: 0,
          }))
        ).slice(0, 5)

        if (!cancelled) setData({ feed: sortFeed(items), convergences, suggestions, loading: false, error: false })
      } catch {
        if (!cancelled) setData(d => ({ ...d, loading: false, error: true }))
      }
    }
    run()
    return () => { cancelled = true }
  }, [currentActor])

  return data
}

export function useNetworkActivityMini(): FeedItem[] {
  const { feed } = useCommunityFeed()
  return feed.slice(0, 3)
}
