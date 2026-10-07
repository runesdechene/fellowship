/**
 * QUOI     — charge le fil « Activité du réseau » de l'acteur actif : les arrivées sur Fellowship,
 *            les dates prises par ceux qu'il suit, leurs abonnements, les festivals ajoutés.
 * POURQUOI — la surface qui fait circuler le produit, gratuite (maquette 2027, barre latérale).
 * ATTENTION — les abonnements entre tiers passent par une fonction de la base : la RLS de
 *            `follows` ne les laisse pas lire. Pas d'avis ici : leur identité est protégée.
 */
import { useEffect, useState } from 'react'
import { mergeFeed } from '@/lib/activity'
import { fetchActorProfiles, PROGRAMMED_STATUSES, type Friend } from '@/lib/friends'
import { must, supabase } from '@/lib/supabase'

const WINDOW_DAYS = 14
const LIMIT = 4

export interface ActivityItem {
  id: string
  occurredAt: Date
  actor: Friend
  /** Ce qui suit le nom : « vient de rejoindre Fellowship », « va à Sylak »… */
  text: string
}

interface RawItem {
  id: string
  occurredAt: Date
  actorId: string
  text: (names: Map<string, Friend>) => string
}

async function loadActivity(me: string, now: Date): Promise<ActivityItem[]> {
  const since = new Date(now.getTime() - WINDOW_DAYS * 86_400_000).toISOString()
  const following = must(
    await supabase.from('follows').select('following_actor').eq('follower_actor', me),
  ).map((row) => row.following_actor)

  const [joins, participations, follows, events] = await Promise.all([
    supabase
      .from('entities')
      .select('actor_id, created_at')
      .neq('actor_id', me)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(LIMIT),
    following.length === 0
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from('participations')
          .select('id, actor_id, created_at, events!inner(name)')
          .in('actor_id', following)
          .in('status', PROGRAMMED_STATUSES)
          .eq('events.is_private', false)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(LIMIT),
    following.length === 0
      ? Promise.resolve({ data: [], error: null })
      : supabase.rpc('get_network_follow_activity', { p_actor_id: me, p_since: since }),
    supabase
      .from('events')
      .select('id, name, created_by_actor, created_at')
      .eq('is_private', false)
      .neq('created_by_actor', me)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(LIMIT),
  ])

  const raw = mergeFeed<RawItem>(
    [
      must(joins).map((row) => ({
        id: `join-${row.actor_id}`,
        occurredAt: new Date(row.created_at),
        actorId: row.actor_id,
        text: () => 'vient de rejoindre Fellowship',
      })),
      must(participations).map((row) => ({
        id: `part-${row.id}`,
        occurredAt: new Date(row.created_at),
        actorId: row.actor_id,
        text: () => `va à ${row.events.name}`,
      })),
      must(follows).map((row) => ({
        id: `follow-${row.follow_id}`,
        occurredAt: new Date(row.occurred_at),
        actorId: row.src_actor,
        text: (names: Map<string, Friend>) =>
          `suit ${names.get(row.dst_actor)?.name ?? 'un exposant'}`,
      })),
      must(events).flatMap((row) =>
        row.created_by_actor
          ? [
              {
                id: `event-${row.id}`,
                occurredAt: new Date(row.created_at),
                actorId: row.created_by_actor,
                text: () => `a ajouté ${row.name}`,
              },
            ]
          : [],
      ),
    ],
    LIMIT,
  )

  const followTargets = must(follows).map((row) => row.dst_actor)
  const names = await fetchActorProfiles([
    ...new Set([...raw.map((r) => r.actorId), ...followTargets]),
  ])

  return raw.flatMap((item) => {
    const actor = names.get(item.actorId)
    return actor
      ? [{ id: item.id, occurredAt: item.occurredAt, actor, text: item.text(names) }]
      : []
  })
}

export interface NetworkActivity {
  items: ActivityItem[]
  error: boolean
}

export function useNetworkActivity(actorId: string | null | undefined): NetworkActivity {
  const [state, setState] = useState<NetworkActivity>({ items: [], error: false })

  useEffect(() => {
    if (!actorId) return
    let cancelled = false

    async function run(me: string) {
      let next: NetworkActivity
      try {
        next = { items: await loadActivity(me, new Date()), error: false }
      } catch {
        next = { items: [], error: true }
      }
      if (cancelled) return
      setState(next)
    }

    void run(actorId)
    return () => {
      cancelled = true
    }
  }, [actorId])

  return state
}
