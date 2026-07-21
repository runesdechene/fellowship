import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

export type ReplyWithActor = {
  id: string
  review_id: string
  actor_id: string
  body: string
  created_at: string
  updated_at: string
  is_self: boolean
  identity_visible: boolean
  actor_label: string | null
  actor_avatar_url: string | null
  actor_slug: string | null
}

export function useReviewReplies(reviewId: string) {
  const { currentActor } = useAuth()
  const [replies, setReplies] = useState<ReplyWithActor[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReplies = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.rpc as any)('get_review_replies', {
      p_review_id: reviewId, p_viewer_actor: currentActor?.id ?? null,
    })
    const rows = ((data as Array<Record<string, unknown>> | null) ?? []).map(r => ({
      id: r.reply_id as string,
      review_id: r.review_id as string,
      // `actor_id` = author_actor_id renvoyé par la RPC uniquement si l'identité est
      // visible (toujours vrai pour soi-même) — nécessaire à canEditReply/canDeleteReply
      // (comparaison actor.id === reply.actor_id) ; '' si masqué, ne matchera jamais.
      actor_id: (r.author_actor_id as string | null) ?? '',
      body: r.body as string,
      created_at: r.created_at as string,
      updated_at: r.updated_at as string,
      is_self: r.is_self as boolean,
      identity_visible: r.identity_visible as boolean,
      actor_label: (r.author_label as string | null) ?? null,
      actor_avatar_url: (r.author_avatar_url as string | null) ?? null,
      actor_slug: (r.author_slug as string | null) ?? null,
    }))
    setReplies(rows) // déjà triés ASC par la RPC
    setLoading(false)
  }, [reviewId, currentActor?.id])

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
