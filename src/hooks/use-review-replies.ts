import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { sortReplies } from '@/lib/review-replies'

export type ReplyWithActor = {
  id: string
  review_id: string
  actor_id: string
  body: string
  created_at: string
  updated_at: string
  actor_label: string | null
  actor_avatar_url: string | null
  actor_slug: string | null
}

async function attachActors(
  rows: Array<{ actor_id: string; [k: string]: unknown }>,
): Promise<ReplyWithActor[]> {
  const ids = [...new Set(rows.map(r => r.actor_id))]
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
  return rows.map(r => ({
    id: r.id as string,
    review_id: r.review_id as string,
    actor_id: r.actor_id,
    body: r.body as string,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
    actor_label: byId[r.actor_id]?.label ?? null,
    actor_avatar_url: byId[r.actor_id]?.avatar_url ?? null,
    actor_slug: byId[r.actor_id]?.public_slug ?? null,
  }))
}

export function useReviewReplies(reviewId: string) {
  const [replies, setReplies] = useState<ReplyWithActor[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReplies = useCallback(async () => {
    const { data } = await supabase
      .from('review_replies').select('*').eq('review_id', reviewId)
    const rows = (data as Array<{ actor_id: string; created_at: string; [k: string]: unknown }> | null) ?? []
    setReplies(sortReplies(await attachActors(rows)))
    setLoading(false)
  }, [reviewId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReplies()
  }, [fetchReplies])

  return { replies, loading, refetch: fetchReplies }
}

export async function createReply(input: {
  review_id: string; actor_id: string; acted_by_user_id: string; body: string
}) {
  const { data, error } = await supabase.from('review_replies').insert(input).select('*').single()
  return { data, error }
}

export async function updateReply(id: string, body: string) {
  const { data, error } = await supabase
    .from('review_replies')
    .update({ body, updated_at: new Date().toISOString() })
    .eq('id', id).select('*').single()
  return { data, error }
}

export async function deleteReply(id: string) {
  const { error } = await supabase.from('review_replies').delete().eq('id', id)
  return { error }
}
