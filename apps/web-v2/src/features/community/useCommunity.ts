/**
 * QUOI     — charge la page Communauté de l'acteur actif : le fil, « Où vous vous croiserez »,
 *            « À suivre », et qui il suit déjà ; Suivre et Repérer.
 * POURQUOI — lot 9a. La base rend des lignes prêtes à afficher (community_feed, crossing_dates,
 *            accounts_to_follow), l'identité protégée déjà appliquée ; ce hook les lit et relit.
 * ATTENTION — une lecture ratée est une erreur affichée, jamais un fil vide (.claude/rules/v2.md).
 */
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import {
  readFeed,
  readFollowReason,
  readPeople,
  type FeedLine,
  type FeedPerson,
  type FollowReason,
} from '@/lib/community'
import { must, supabase } from '@/lib/supabase'

export interface Crossing {
  eventId: string
  name: string
  startDate: string
  endDate: string
  imageUrl: string | null
  companions: number
  /** Trois visages au plus, pour les petites bulles (Uriel, 11/10/2026). */
  faces: FeedPerson[]
}

export interface ToFollow {
  id: string
  name: string
  avatarUrl: string | null
  slug: string | null
  city: string | null
  reason: FollowReason
}

interface CommunityData {
  lines: FeedLine[]
  crossing: Crossing[]
  toFollow: ToFollow[]
  followed: Set<string>
}

async function loadCommunity(actorId: string): Promise<CommunityData> {
  const [feed, crossing, toFollow, follows] = await Promise.all([
    supabase.rpc('community_feed', { p_actor: actorId }),
    supabase.rpc('crossing_dates', { p_actor: actorId }),
    supabase.rpc('accounts_to_follow', { p_actor: actorId }),
    supabase.from('follows').select('following_actor').eq('follower_actor', actorId),
  ])
  return {
    lines: readFeed(must(feed)),
    crossing: must(crossing).map((row) => ({
      eventId: row.event_id,
      name: row.event_name.trim(),
      startDate: row.event_start,
      endDate: row.event_end,
      imageUrl: row.event_image,
      companions: row.companions,
      faces: readPeople(row.faces),
    })),
    toFollow: must(toFollow).flatMap((row) => {
      const reason = readFollowReason(row.reason)
      return reason
        ? [
            {
              id: row.id,
              name: row.name,
              avatarUrl: row.avatar,
              slug: row.slug,
              city: row.city,
              reason,
            },
          ]
        : []
    }),
    followed: new Set(must(follows).map((row) => row.following_actor)),
  }
}

const EMPTY: CommunityData = { lines: [], crossing: [], toFollow: [], followed: new Set() }

export function useCommunity(actorId: string | undefined) {
  const { person } = useAuth()
  const [data, setData] = useState<CommunityData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!actorId) return
    let cancelled = false
    async function load(id: string) {
      let result: CommunityData | null
      try {
        result = await loadCommunity(id)
      } catch {
        result = null
      }
      if (cancelled) return
      if (result) setData(result)
      setError(result === null)
      setLoading(false)
    }
    void load(actorId)
    return () => {
      cancelled = true
    }
  }, [actorId, version])

  /** Suivre : le bouton disparaît aussitôt ; si l'écriture échoue, il revient. */
  const follow = useCallback(
    async (id: string) => {
      if (!actorId) return
      setData((current) => ({ ...current, followed: new Set([...current.followed, id]) }))
      const { error: failed } = await supabase
        .from('follows')
        .insert({ follower_actor: actorId, following_actor: id })
      if (failed) {
        setData((current) => {
          const followed = new Set(current.followed)
          followed.delete(id)
          return { ...current, followed }
        })
        return
      }
      setVersion((current) => current + 1)
    },
    [actorId],
  )

  /** Repérer « Ça se rassemble » : le même geste que dans la cloche. */
  const mark = useCallback(
    async (eventId: string) => {
      if (!actorId) return
      must(
        await supabase.from('participations').upsert(
          {
            actor_id: actorId,
            event_id: eventId,
            status: 'interesse',
            acted_by_user_id: person?.actor_id ?? null,
          },
          { onConflict: 'actor_id,event_id', ignoreDuplicates: true },
        ),
      )
      setVersion((current) => current + 1)
    },
    [actorId, person],
  )

  return { ...data, loading, error, follow, mark }
}
