/**
 * QUOI     — charge la page Communauté de l'acteur actif : le fil, « Où vous vous croiserez »,
 *            « À suivre », et qui il suit déjà ; Suivre et Repérer.
 * POURQUOI — lot 9a. La base rend des lignes prêtes à afficher (community_feed, crossing_dates,
 *            accounts_to_follow), l'identité protégée déjà appliquée ; ce hook les lit et relit.
 *            Tout Suivre (événement `reseau-change`) relit la page. Deux fils : ses abonnements (par
 *            défaut), ou toute la plateforme (par défaut pour qui ne suit personne). Ouvrir la page
 *            lit puis remet à maintenant community_seen_at : ce qui est plus récent se marque nouveau.
 * ATTENTION — une lecture ratée est une erreur affichée, jamais un fil vide (.claude/rules/v2.md).
 */
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import {
  appendPage,
  defaultScope,
  pageCursor,
  readFeed,
  readFollowReason,
  readPeople,
  readTags,
  type FeedLine,
  type FeedScope,
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
  /** Ses amis qui sont aussi les tiens : leur nombre et trois visages (mutual_friends). */
  mutual: { total: number; faces: FeedPerson[] }
}

/** Les nouvelles chargées à la fois ; « Afficher plus » charge les précédentes. */
const PAGE_SIZE = 40

interface CommunityData {
  /** Le fil lu (le demandé, ou celui de defaultScope) : un autre fil demandé ne montre jamais l'ancien. */
  scope: FeedScope
  lines: FeedLine[]
  /** Une page pleine : il en reste peut-être d'autres, plus anciennes. */
  hasMore: boolean
  crossing: Crossing[]
  toFollow: ToFollow[]
  followed: Set<string>
}

async function loadCommunity(actorId: string, requested: FeedScope | null): Promise<CommunityData> {
  const [crossing, toFollow, follows] = await Promise.all([
    supabase.rpc('crossing_dates', { p_actor: actorId }),
    supabase.rpc('accounts_to_follow', { p_actor: actorId }),
    supabase.from('follows').select('following_actor').eq('follower_actor', actorId),
  ])
  const followed = must(follows)
  // Le fil par défaut dépend des abonnements : il se lit après eux.
  const scope = requested ?? defaultScope(followed.length)
  const lines = readFeed(
    must(
      await supabase.rpc('community_feed', {
        p_actor: actorId,
        p_limit: PAGE_SIZE,
        p_scope: scope,
      }),
    ),
  )
  return {
    scope,
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
    toFollow: await withMutual(actorId, must(toFollow)),
    followed: new Set(followed.map((row) => row.following_actor)),
  }
}

/** Les comptes à suivre, chacun avec ses amis en commun (une seconde lecture, sur leurs ids). */
async function withMutual(
  actorId: string,
  rows: { id: string; name: string; avatar: string; slug: string; city: string; reason: unknown }[],
): Promise<ToFollow[]> {
  const ids = rows.map((row) => row.id)
  const mutual =
    ids.length === 0
      ? []
      : must(await supabase.rpc('mutual_friends', { p_actor: actorId, p_others: ids }))
  const byId = new Map(
    mutual.map((row) => [row.other_id, { total: row.total, faces: readPeople(row.faces) }]),
  )
  return rows.flatMap((row) => {
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
            mutual: byId.get(row.id) ?? { total: 0, faces: [] },
          },
        ]
      : []
  })
}

const EMPTY: CommunityData = {
  scope: 'reseau',
  lines: [],
  hasMore: false,
  crossing: [],
  toFollow: [],
  followed: new Set(),
}

export function useCommunity(actorId: string | undefined, requested: FeedScope | null) {
  const { person } = useAuth()
  const [data, setData] = useState<CommunityData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [version, setVersion] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreFailed, setMoreFailed] = useState(false)
  const [seen, setSeen] = useState<Date | null>(null)

  // La dernière visite, lue avant d'être remise à maintenant : ce qui est plus récent est nouveau.
  // La pastille (useCommunityNews) compte depuis cet instant.
  useEffect(() => {
    const me = person?.actor_id
    if (!me) return
    let cancelled = false
    async function visit(id: string) {
      const response = await supabase
        .from('users')
        .select('community_seen_at')
        .eq('actor_id', id)
        .maybeSingle()
      // La requête ne part qu'attendue : un `void supabase.from(…).update(…)` seul n'envoie rien.
      await supabase
        .from('users')
        .update({ community_seen_at: new Date().toISOString() })
        .eq('actor_id', id)
      if (cancelled || !response.data) return
      setSeen(new Date(response.data.community_seen_at))
    }
    void visit(me)
    return () => {
      cancelled = true
    }
  }, [person?.actor_id])

  // Un Suivre ou un Refuser, ici ou ailleurs (la cloche, « Ta communauté ») : tout se relit.
  useEffect(() => {
    const reload = () => setVersion((current) => current + 1)
    window.addEventListener(NETWORK_CHANGED, reload)
    return () => window.removeEventListener(NETWORK_CHANGED, reload)
  }, [])

  useEffect(() => {
    if (!actorId) return
    let cancelled = false
    async function load(id: string) {
      let result: CommunityData | null
      try {
        result = await loadCommunity(id, requested)
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
  }, [actorId, requested, version])

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
            p_scope: data.scope,
          }),
        ),
      )
      setData((current) => ({ ...current, ...appendPage(current.lines, page, PAGE_SIZE) }))
    } catch {
      setMoreFailed(true)
    } finally {
      setLoadingMore(false)
    }
  }, [actorId, data.lines, data.scope])

  /** Suivre : le bouton disparaît aussitôt ; si l'écriture échoue, il revient. */
  /** `welcome` : l'abonné souhaite la bienvenue ; la base l'annonce ainsi au nouveau venu. */
  const follow = useCallback(
    async (id: string, welcome = false) => {
      if (!actorId) return
      setData((current) => ({ ...current, followed: new Set([...current.followed, id]) }))
      const { error: failed } = await supabase
        .from('follows')
        .insert({ follower_actor: actorId, following_actor: id, welcome })
      if (failed) {
        setData((current) => {
          const followed = new Set(current.followed)
          followed.delete(id)
          return { ...current, followed }
        })
        return
      }
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

  // Sans fil demandé, le fil lu est le bon ; le défaut écrit ensuite dans l'adresse ne vide rien.
  const current = requested === null || data.scope === requested
  return {
    ...data,
    seen,
    lines: current ? data.lines : [],
    hasMore: current && data.hasMore,
    loading: loading || !current,
    error,
    loadingMore,
    moreFailed,
    loadMore,
    follow,
    mark,
  }
}
