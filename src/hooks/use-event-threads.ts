import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { sortThreads, type ThreadAudience } from '@/lib/event-threads'

export type ThreadWithActor = {
  id: string
  event_id: string
  actor_id: string
  audience: ThreadAudience
  title: string
  body: string | null
  best_reply_id: string | null
  created_at: string
  updated_at: string
  reply_count: number
  actor_label: string | null
  actor_avatar_url: string | null
  actor_slug: string | null
}

async function actorMap(actorIds: string[]) {
  const ids = [...new Set(actorIds)]
  if (ids.length === 0) return {} as Record<string, { label: string | null; avatar_url: string | null; public_slug: string | null }>
  const { data } = await supabase
    .from('actor_public').select('actor_id, label, avatar_url, public_slug').in('actor_id', ids)
  return Object.fromEntries(
    (data ?? [])
      .filter(a => a.actor_id != null)
      .map(a => [a.actor_id as string, { label: a.label, avatar_url: a.avatar_url, public_slug: a.public_slug }]),
  )
}

export function useEventThreads(eventId: string) {
  const [threads, setThreads] = useState<ThreadWithActor[]>([])
  const [loading, setLoading] = useState(true)

  const fetchThreads = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).from('event_threads')
      .select('*').eq('event_id', eventId)
    const rows = (data as Array<Record<string, unknown>> | null) ?? []

    // comptage des réponses par thread (requête légère : ids seuls)
    const threadIds = rows.map(r => r.id as string)
    const counts: Record<string, number> = {}
    if (threadIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rep } = await (supabase as any).from('event_thread_replies')
        .select('thread_id').in('thread_id', threadIds)
      for (const r of (rep as Array<{ thread_id: string }> | null) ?? []) {
        counts[r.thread_id] = (counts[r.thread_id] ?? 0) + 1
      }
    }

    const map = await actorMap(rows.map(r => r.actor_id as string))
    const enriched: ThreadWithActor[] = rows.map(r => ({
      id: r.id as string,
      event_id: r.event_id as string,
      actor_id: r.actor_id as string,
      audience: r.audience as ThreadAudience,
      title: r.title as string,
      body: (r.body as string | null) ?? null,
      best_reply_id: (r.best_reply_id as string | null) ?? null,
      created_at: r.created_at as string,
      updated_at: r.updated_at as string,
      reply_count: counts[r.id as string] ?? 0,
      actor_label: map[r.actor_id as string]?.label ?? null,
      actor_avatar_url: map[r.actor_id as string]?.avatar_url ?? null,
      actor_slug: map[r.actor_id as string]?.public_slug ?? null,
    }))
    setThreads(sortThreads(enriched))
    setLoading(false)
  }, [eventId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchThreads()
  }, [fetchThreads])

  return { threads, loading, refetch: fetchThreads }
}

export async function createThread(input: {
  event_id: string; actor_id: string; acted_by_user_id: string | null
  audience: ThreadAudience; title: string; body: string | null
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).from('event_threads').insert(input).select('*').single()
  return { data, error }
}

export async function updateThread(id: string, patch: { title?: string; body?: string | null }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).from('event_threads')
    .update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).select('*').single()
  return { data, error }
}

export async function deleteThread(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('event_threads').delete().eq('id', id)
  return { error }
}

/** Élire (ou changer) la meilleure réponse. replyId null = désélectionner. */
export async function markBestReply(threadId: string, replyId: string | null) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).from('event_threads')
    .update({ best_reply_id: replyId }).eq('id', threadId).select('*').single()
  return { data, error }
}
