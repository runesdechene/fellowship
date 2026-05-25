import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { Review, ReviewInsert } from '@/types/database'

type ReviewWithActor = Review & { actor_label: string | null; actor_entity_type: string | null }

export function useEventReviews(eventId: string | undefined) {
  const { currentActor, person } = useAuth()
  const [reviews, setReviews] = useState<ReviewWithActor[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReviews = useCallback(async () => {
    if (!eventId) return
    const { data: rows } = await supabase
      .from('reviews')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
    const list = (rows as Review[] | null) ?? []
    const actorIds = [...new Set(list.map(r => r.actor_id).filter(Boolean) as string[])]
    let byId: Record<string, { label: string | null; entity_type: string | null }> = {}
    if (actorIds.length > 0) {
      const { data: actors } = await supabase.from('actor_public').select('actor_id, label, entity_type').in('actor_id', actorIds)
      byId = Object.fromEntries((actors ?? []).filter(a => a.actor_id != null).map((a) => [a.actor_id as string, { label: a.label, entity_type: a.entity_type }]))
    }
    setReviews(list.map(r => ({ ...r, actor_label: byId[r.actor_id ?? '']?.label ?? null, actor_entity_type: byId[r.actor_id ?? '']?.entity_type ?? null })))
    setLoading(false)
  }, [eventId])

  useEffect(() => {
    if (!eventId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReviews()
  }, [eventId, fetchReviews])

  const canSeeDetails = currentActor?.kind === 'entity' && person?.plan === 'pro'

  return { reviews, loading, canSeeDetails, refetch: fetchReviews }
}

export function useMyReview(eventId: string | undefined) {
  const { currentActor } = useAuth()
  const [review, setReview] = useState<Review | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!eventId || !currentActor) return
    supabase.from('reviews').select('*')
      .eq('event_id', eventId).eq('actor_id', currentActor.id).maybeSingle()
      .then(({ data }) => { setReview(data); setLoading(false) })
  }, [eventId, currentActor])

  return { review, loading }
}

export async function submitReview(review: ReviewInsert) {
  const { data, error } = await supabase
    .from('reviews')
    .upsert(review, { onConflict: 'actor_id,event_id' })
    .select().single()
  return { data, error }
}
