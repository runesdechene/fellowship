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
    .select('actor_id, label, avatar_url, public_slug, kind')
    .in('actor_id', ids)
  for (const a of data ?? []) {
    if (a.actor_id) map.set(a.actor_id, {
      actorId: a.actor_id, label: a.label ?? '—', avatarUrl: a.avatar_url, slug: a.public_slug,
      kind: a.kind === 'person' || a.kind === 'entity' ? a.kind : undefined,
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
        // Les nouveaux festivals (events) sont plateforme-wide : ils doivent s'afficher MÊME
        // pour un Pro qui ne suit encore personne (cold-start). On ne court-circuite donc plus
        // tout quand followingIds est vide — seules les sources DÉPENDANTES du réseau (avis,
        // participations, follows d'amis) sont sautées, pas la source events.
        const hasFollows = followingIds.length > 0
        const empty = Promise.resolve({ data: null })

        const [revRes, partRes, folRes, upcomingRes, evtRes] = await Promise.all([
          hasFollows ? supabase.from('reviews')
            .select('id, actor_id, event_id, affluence, organisation, rentabilite, comment, created_at')
            .in('actor_id', followingIds).gte('created_at', since)
            .order('created_at', { ascending: false }).limit(FEED_LIMIT) : empty,
          hasFollows ? supabase.from('participations')
            .select('id, actor_id, event_id, status, created_at')
            .in('actor_id', followingIds).gte('created_at', since)
            // 'refuse' = dossier refusé : ne doit jamais s'afficher comme « va à X ».
            .neq('status', 'refuse')
            .order('created_at', { ascending: false }).limit(FEED_LIMIT) : empty,
          // RPC SECURITY DEFINER : la RLS `follows` ne laisse pas lire les follows entre tiers.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          hasFollows ? (supabase.rpc as any)('get_network_follow_activity', { p_actor_id: me, p_since: since }) : empty,
          hasFollows ? supabase.from('participations')
            .select('actor_id, event_id, events!inner(start_date)')
            .in('actor_id', followingIds).gte('events.start_date', today)
            // Idem pour les convergences : on n'aligne pas les agendas sur un refus.
            .neq('status', 'refuse') : empty,
          supabase.from('events')
            .select('id, name, city, start_date, end_date, image_url, slug, created_by_actor, created_at')
            .eq('is_private', false)
            .gte('created_at', since)
            .neq('created_by_actor', me)
            .order('created_at', { ascending: false })
            .limit(FEED_LIMIT),
        ])

        const reviews = revRes.data ?? []
        const parts = partRes.data ?? []
        const fols = (folRes.data ?? []) as Array<{ follow_id: string; src_actor: string; dst_actor: string; occurred_at: string }>
        const upcoming = (upcomingRes.data ?? []) as Array<{ actor_id: string | null; event_id: string }>
        const newEvents = (evtRes.data ?? []) as Array<{
          id: string; name: string; city: string | null; start_date: string; end_date: string;
          image_url: string | null; slug: string | null; created_by_actor: string | null; created_at: string
        }>

        const eventIds = [...new Set([
          ...reviews.map(r => r.event_id), ...parts.map(p => p.event_id),
          ...upcoming.map(u => u.event_id), ...newEvents.map(e => e.id),
        ])]
        const actorIds = [...new Set([
          ...followingIds,
          ...fols.flatMap(f => [f.src_actor, f.dst_actor]).filter((x): x is string => !!x),
          ...newEvents.map(e => e.created_by_actor).filter((x): x is string => !!x),
        ])]
        const [eventsRes, actorMap] = await Promise.all([
          eventIds.length
            ? supabase.from('events').select('id, name, city, start_date, end_date, image_url, slug').eq('is_private', false).in('id', eventIds)
            : Promise.resolve({ data: [] as never[] }),
          loadActors(actorIds),
        ])
        const eventMap: Record<string, FeedEventRef> = {}
        for (const e of eventsRes.data ?? []) {
          eventMap[e.id] = { id: e.id, name: e.name, city: e.city, startDate: e.start_date, endDate: e.end_date, imageUrl: e.image_url, slug: e.slug ?? null }
        }
        for (const e of newEvents) {
          eventMap[e.id] ??= { id: e.id, name: e.name, city: e.city, startDate: e.start_date, endDate: e.end_date, imageUrl: e.image_url, slug: e.slug ?? null }
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
          if (!f.src_actor || !f.dst_actor || f.src_actor === f.dst_actor) continue // ignore self-follow (donnée fautive)
          items.push({
            id: `fol-${f.follow_id}`, kind: 'follow', occurredAt: f.occurred_at,
            actor: unknownActor(f.src_actor), target: unknownActor(f.dst_actor),
          })
        }
        for (const e of newEvents) {
          if (!e.created_by_actor || !eventMap[e.id]) continue
          items.push({
            id: `evc-${e.id}`, kind: 'event_created', occurredAt: e.created_at,
            actor: unknownActor(e.created_by_actor), event: eventMap[e.id],
          })
        }

        const convParts = upcoming
          .filter(u => u.actor_id)
          .map(u => ({ eventId: u.event_id, actor: unknownActor(u.actor_id) }))
        const convergences = rankConvergences(convParts, eventMap).slice(0, 5)

        // Deux sources de suggestions, fusionnées par acteur :
        //  - get_follow_suggestions : amis d'amis (vide tant qu'on ne suit personne)
        //  - get_coevent_suggestions : gens qui vont aux mêmes festivals que moi (cold-start)
        const [followSugg, coeventSugg] = await Promise.all([
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase.rpc as any)('get_follow_suggestions', { p_actor_id: me }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase.rpc as any)('get_coevent_suggestions', { p_actor_id: me }),
        ])
        const followList = (followSugg.data ?? []) as Array<{ suggested_actor: string; shared_followers: number }>
        const coeventList = (coeventSugg.data ?? []) as Array<{ suggested_actor: string; shared_events: number }>

        const suggMap = new Map<string, { sharedFollowers: number; sharedEvents: number }>()
        for (const s of followList) {
          if (s.suggested_actor && s.suggested_actor !== me) suggMap.set(s.suggested_actor, { sharedFollowers: Number(s.shared_followers), sharedEvents: 0 })
        }
        for (const s of coeventList) {
          if (!s.suggested_actor || s.suggested_actor === me) continue // jamais se suggérer soi-même
          const cur = suggMap.get(s.suggested_actor) ?? { sharedFollowers: 0, sharedEvents: 0 }
          cur.sharedEvents = Number(s.shared_events)
          suggMap.set(s.suggested_actor, cur)
        }

        const suggActors = await loadActors([...suggMap.keys()])
        // Garde de sûreté : on ne suggère QUE des comptes exposants (entités), jamais des
        // festivaliers (personnes) — une suggestion mène à une vitrine qu'eux seuls ont.
        // Les RPC filtrent déjà kind='entity' ; ceci couvre le cas d'une DB pas encore migrée.
        const ranked = rankSuggestions(
          [...suggMap.entries()]
            .map(([actorId, s]) => ({
              actor: suggActors.get(actorId) ?? unknownActor(actorId),
              sharedFollowers: s.sharedFollowers, sharedEvents: s.sharedEvents,
            }))
            .filter(c => c.actor.kind === 'entity')
        )
        // 3 suggestions, mélangées à chaque chargement de page : on varie les profils mis en
        // avant plutôt que de figer le top-3 (découverte > classement strict au cold-start).
        // Mélange non biaisé : clé aléatoire par élément puis tri (≠ sort(()=>random-0.5)).
        const suggestions = ranked
          .map(s => ({ s, r: Math.random() }))
          .sort((a, b) => a.r - b.r)
          .slice(0, 3)
          .map(x => x.s)

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
