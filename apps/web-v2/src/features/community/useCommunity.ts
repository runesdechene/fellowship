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
  appendPage,
  pageCursor,
  readFeed,
  readFollowReason,
  readPeople,
  readTags,
  type FeedLine,
  type FeedPerson,
  type FollowReason,
} from '@/lib/community'
import { must, supabase } from '@/lib/supabase'
import { NETWORK_CHANGED } from './useNetwork'

export interface Crossing {
  eventId: string
  name: string
  startDate: string
  endDate: string
  imageUrl: string | null
  tags: string[]
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

/** Les nouvelles chargées à la fois ; « Afficher plus » charge les précédentes. */
const PAGE_SIZE = 40

interface CommunityData {
  lines: FeedLine[]
  /** Une page pleine : il en reste peut-être d'autres, plus anciennes. */
  hasMore: boolean
  crossing: Crossing[]
  toFollow: ToFollow[]
  followed: Set<string>
}

async function loadCommunity(actorId: string): Promise<CommunityData> {
  const [feed, crossing, toFollow, follows] = await Promise.all([
    supabase.rpc('community_feed', { p_actor: actorId, p_limit: PAGE_SIZE }),
    supabase.rpc('crossing_dates', { p_actor: actorId }),
    supabase.rpc('accounts_to_follow', { p_actor: actorId }),
    supabase.from('follows').select('following_actor').eq('follower_actor', actorId),
  ])
  const lines = readFeed(must(feed))
  return {
    lines,
    hasMore: lines.filter((line) => line.kind !== 'gathering').length >= PAGE_SIZE,
    crossing: must(crossing).map((row) => ({
      eventId: row.event_id,
      name: row.event_name.trim(),
      startDate: row.event_start,
      endDate: row.event_end,
      imageUrl: row.event_image,
      tags: readTags(row.event_tags),
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

const EMPTY: CommunityData = {
  lines: [],
  hasMore: false,
  crossing: [],
  toFollow: [],
  followed: new Set(),
}

export function useCommunity(actorId: string | undefined) {
  const { person } = useAuth()
  const [data, setData] = useState<CommunityData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [version, setVersion] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreFailed, setMoreFailed] = useState(false)

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

  /** « Afficher plus » : la page d'avant la plus ancienne nouvelle, ajoutée au bout. */
  const loadMore = useCallback(async () => {
    const before = pageCursor(data.lines)
    if (!actorId || !before) return
    setLoadingMore(true)
    setMoreFailed(false)
    try {
      const page = readFeed(
        must(
          await supabase.rpc('community_feed', {
            p_actor: actorId,
            p_before: before,
            p_limit: PAGE_SIZE,
          }),
        ),
      )
      setData((current) => ({ ...current, ...appendPage(current.lines, page, PAGE_SIZE) }))
    } catch {
      setMoreFailed(true)
    } finally {
      setLoadingMore(false)
    }
  }, [actorId, data.lines])

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
      window.dispatchEvent(new Event(NETWORK_CHANGED))
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

  return { ...data, loading, error, loadingMore, moreFailed, loadMore, follow, mark }
}
