import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export type ThreadReplyWithActor = {
  id: string
  thread_id: string
  actor_id: string
  body: string
  created_at: string
  updated_at: string
  actor_label: string | null
  actor_avatar_url: string | null
  actor_slug: string | null
}

export function useThreadReplies(threadId: string) {
  const [replies, setReplies] = useState<ThreadReplyWithActor[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReplies = useCallback(async () => {
    const { data } = await (supabase as any).from('event_thread_replies')
      .select('*').eq('thread_id', threadId)
    const rows = (data as Array<Record<string, unknown>> | null) ?? []
    const ids = [...new Set(rows.map(r => r.actor_id as string))]
    let byId: Record<string, { label: string | null; avatar_url: string | null; public_slug: string | null }> = {}
    if (ids.length > 0) {
      const { data: actors } = await supabase
        .from('actor_public').select('actor_id, label, avatar_url, public_slug').in('actor_id', ids)
      byId = Object.fromEntries(
        (actors ?? [])
          .filter(a => a.actor_id != null)
          .map(a => [a.actor_id as string, { label: a.label, avatar_url: a.avatar_url, public_slug: a.public_slug }]),
      )
    }
    setReplies(rows.map(r => ({
      id: r.id as string,
      thread_id: r.thread_id as string,
      actor_id: r.actor_id as string,
      body: r.body as string,
      created_at: r.created_at as string,
      updated_at: r.updated_at as string,
      actor_label: byId[r.actor_id as string]?.label ?? null,
      actor_avatar_url: byId[r.actor_id as string]?.avatar_url ?? null,
      actor_slug: byId[r.actor_id as string]?.public_slug ?? null,
    })))
    setLoading(false)
  }, [threadId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReplies()
  }, [fetchReplies])

  return { replies, loading, refetch: fetchReplies }
}

export async function createThreadReply(input: {
  thread_id: string; actor_id: string; acted_by_user_id: string | null; body: string
}) {
  const { data, error } = await (supabase as any).from('event_thread_replies').insert(input).select('*').single()
  return { data, error }
}

export async function updateThreadReply(id: string, body: string) {
  const { data, error } = await (supabase as any).from('event_thread_replies')
    .update({ body, updated_at: new Date().toISOString() }).eq('id', id).select('*').single()
  return { data, error }
}

export async function deleteThreadReply(id: string) {
  const { error } = await (supabase as any).from('event_thread_replies').delete().eq('id', id)
  return { error }
}
