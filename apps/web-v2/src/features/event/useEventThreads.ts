import { useCallback, useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchActorProfiles } from '@/lib/friends'
import { supabase } from '@/lib/supabase'
import { sortReplies, sortThreads, type ThreadAudience } from '@/lib/threads'

/**
 * `src/types/supabase.ts` ne connaît pas encore `event_threads` ni
 * `event_thread_replies` : il a été généré avant ces migrations. On passe donc
 * par un client sans schéma pour CES DEUX TABLES seulement, et chaque ligne
 * lue est remise dans un type explicite juste en dessous — le typage se perd
 * sur l'appel, pas sur les données.
 *
 * DETTE À SOLDER : régénérer les types (`supabase gen types typescript
 * --linked`) dès que le jeton d'accès sera renouvelé, puis retirer ce client.
 */
const db = supabase as unknown as SupabaseClient

/** Une ligne de `event_threads`, telle que la base la rend. */
interface ThreadRow {
  id: string
  actor_id: string
  audience: string
  title: string
  body: string | null
  best_reply_id: string | null
  created_at: string
}

/** Une ligne de `event_thread_replies`. */
interface ReplyRow {
  id: string
  thread_id: string
  actor_id: string
  body: string
  created_at: string
}

/** Ce qu'un auteur montre de lui à côté de son message. */
interface Author {
  name: string
  avatarUrl: string | null
}

export interface ThreadReply extends Author {
  id: string
  threadId: string
  actorId: string
  body: string
  createdAt: string
}

export interface Thread extends Author {
  id: string
  actorId: string
  audience: ThreadAudience
  title: string
  body: string | null
  bestReplyId: string | null
  createdAt: string
  replies: ThreadReply[]
}

export interface ThreadsData {
  threads: Thread[]
  loading: boolean
  error: string | null
  /** Une écriture est en cours : on ne rejoue pas le même geste deux fois. */
  saving: boolean
  ask: (input: {
    audience: ThreadAudience
    title: string
    body: string
  }) => Promise<void>
  reply: (threadId: string, body: string) => Promise<void>
  markBest: (threadId: string, replyId: string | null) => Promise<void>
  remove: (threadId: string) => Promise<void>
  removeReply: (replyId: string) => Promise<void>
}

const NO_ONE = 'Quelqu’un'

/**
 * Lit la discussion d'un événement : les questions, leurs réponses, et le nom
 * de chaque auteur. Fonction de module, hors de tout hook — c'est ce qui
 * permet de l'appeler depuis un effet SANS y poser d'état, et donc sans
 * déclencher de rendu en cascade.
 */
async function fetchThreads(eventId: string): Promise<Thread[]> {
  const { data: rows, error } = await db
    .from('event_threads')
    .select('id, actor_id, audience, title, body, best_reply_id, created_at')
    .eq('event_id', eventId)

  if (error) throw new Error(error.message)

  const threadRows = (rows ?? []) as ThreadRow[]
  if (threadRows.length === 0) return []

  const { data: replyRowsRaw } = await db
    .from('event_thread_replies')
    .select('id, thread_id, actor_id, body, created_at')
    .in(
      'thread_id',
      threadRows.map((row) => row.id),
    )

  const replyRows = (replyRowsRaw ?? []) as ReplyRow[]

  // Un seul aller-retour pour tous les auteurs, questions et réponses
  // confondues : une requête par message ferait des dizaines d'appels sur un
  // fil un peu vivant.
  const actorIds = [
    ...new Set([
      ...threadRows.map((row) => row.actor_id),
      ...replyRows.map((row) => row.actor_id),
    ]),
  ]
  const profiles = await fetchActorProfiles(actorIds)

  const repliesByThread = new Map<string, ThreadReply[]>()
  for (const row of replyRows) {
    const profile = profiles.get(row.actor_id)
    const list = repliesByThread.get(row.thread_id) ?? []
    list.push({
      id: row.id,
      threadId: row.thread_id,
      actorId: row.actor_id,
      body: row.body,
      createdAt: row.created_at,
      name: profile?.name ?? NO_ONE,
      avatarUrl: profile?.avatarUrl ?? null,
    })
    repliesByThread.set(row.thread_id, list)
  }

  return sortThreads(
    threadRows.map((row) => {
      const profile = profiles.get(row.actor_id)
      return {
        id: row.id,
        actorId: row.actor_id,
        audience: row.audience as ThreadAudience,
        title: row.title,
        body: row.body,
        bestReplyId: row.best_reply_id,
        createdAt: row.created_at,
        name: profile?.name ?? NO_ONE,
        avatarUrl: profile?.avatarUrl ?? null,
        replies: sortReplies(repliesByThread.get(row.id) ?? [], row.best_reply_id),
      }
    }),
  )
}

/**
 * La discussion d'un festival : les questions, leurs réponses, et de quoi
 * écrire.
 *
 * Tout est relu après chaque écriture plutôt que deviné. La meilleure réponse
 * est posée par un trigger côté base, et une réponse peut être supprimée par
 * un admin sans qu'on le sache : recalculer localement finirait par mentir.
 */
export function useEventThreads(
  eventId: string | undefined,
  actorId: string | null | undefined,
  personActorId?: string | null,
): ThreadsData {
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Le corps de l'effet ne pose aucun état : tout se joue après un await.
  useEffect(() => {
    let cancelled = false

    async function run() {
      if (!eventId) {
        if (!cancelled) setLoading(false)
        return
      }
      try {
        const rows = await fetchThreads(eventId)
        if (cancelled) return
        setThreads(rows)
        setError(null)
      } catch {
        if (cancelled) return
        setError('La discussion n’a pas pu être chargée.')
      }
      if (!cancelled) setLoading(false)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [eventId])

  /** Relit après une écriture : les droits et les triggers ont pu bouger. */
  const reload = useCallback(async () => {
    if (!eventId) return
    try {
      setThreads(await fetchThreads(eventId))
    } catch {
      setError('La discussion n’a pas pu être rechargée.')
    }
  }, [eventId])

  /**
   * Toute écriture suit le même chemin : écrire, dire si ça a raté, relire.
   *
   * `PromiseLike` et non `Promise` : une requête Supabase est un builder qu'on
   * peut attendre, pas une vraie promesse — elle n'a ni `catch` ni `finally`.
   */
  const write = useCallback(
    async (
      run: () => PromiseLike<{ error: { message: string } | null }>,
      failure: string,
    ) => {
      if (saving) return
      setSaving(true)
      setError(null)
      const { error: writeError } = await run()
      if (writeError) {
        setError(failure)
        setSaving(false)
        return
      }
      await reload()
      setSaving(false)
    },
    [saving, reload],
  )

  const ask = useCallback(
    async (input: { audience: ThreadAudience; title: string; body: string }) => {
      if (!eventId || !actorId) return
      await write(
        () =>
          db.from('event_threads').insert({
            event_id: eventId,
            actor_id: actorId,
            acted_by_user_id: personActorId ?? null,
            audience: input.audience,
            title: input.title.trim(),
            body: input.body.trim() || null,
          }),
        'La question n’a pas pu être publiée.',
      )
    },
    [eventId, actorId, personActorId, write],
  )

  const reply = useCallback(
    async (threadId: string, body: string) => {
      if (!actorId || !body.trim()) return
      await write(
        () =>
          db.from('event_thread_replies').insert({
            thread_id: threadId,
            actor_id: actorId,
            acted_by_user_id: personActorId ?? null,
            body: body.trim(),
          }),
        'La réponse n’a pas pu être publiée.',
      )
    },
    [actorId, personActorId, write],
  )

  const markBest = useCallback(
    async (threadId: string, replyId: string | null) => {
      await write(
        () =>
          db.from('event_threads').update({ best_reply_id: replyId }).eq('id', threadId),
        'La meilleure réponse n’a pas pu être changée.',
      )
    },
    [write],
  )

  const remove = useCallback(
    async (threadId: string) => {
      await write(
        () => db.from('event_threads').delete().eq('id', threadId),
        'La question n’a pas pu être supprimée.',
      )
    },
    [write],
  )

  const removeReply = useCallback(
    async (replyId: string) => {
      await write(
        () => db.from('event_thread_replies').delete().eq('id', replyId),
        'La réponse n’a pas pu être supprimée.',
      )
    },
    [write],
  )

  return { threads, loading, error, saving, ask, reply, markBest, remove, removeReply }
}
