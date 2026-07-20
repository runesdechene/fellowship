import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { Review, ReviewInsert } from '@/types/database'

export type ReviewWithActor = Review & {
  actor_label: string | null
  actor_entity_type: string | null
  actor_avatar_url: string | null
  actor_slug: string | null
}

export function useEventReviews(eventId: string | undefined) {
  const { currentActor } = useAuth()
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
    let byId: Record<string, { label: string | null; entity_type: string | null; avatar_url: string | null; public_slug: string | null }> = {}
    if (actorIds.length > 0) {
      const { data: actors } = await supabase
        .from('actor_public')
        .select('actor_id, label, entity_type, avatar_url, public_slug')
        .in('actor_id', actorIds)
      byId = Object.fromEntries(
        (actors ?? [])
          .filter(a => a.actor_id != null)
          .map((a) => [a.actor_id as string, {
            label: a.label,
            entity_type: a.entity_type,
            avatar_url: a.avatar_url,
            public_slug: a.public_slug,
          }])
      )
    }
    setReviews(list.map(r => ({
      ...r,
      actor_label: byId[r.actor_id ?? '']?.label ?? null,
      actor_entity_type: byId[r.actor_id ?? '']?.entity_type ?? null,
      actor_avatar_url: byId[r.actor_id ?? '']?.avatar_url ?? null,
      actor_slug: byId[r.actor_id ?? '']?.public_slug ?? null,
    })))
    setLoading(false)
  }, [eventId])

  useEffect(() => {
    if (!eventId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReviews()
  }, [eventId, fetchReviews])

  // Les avis sont un bien commun exposants : tout exposant (entité) lit le détail,
  // plus seulement le Pro (décision 0005). Une personne/festivalier ne voit de
  // toute façon pas le bloc avis (gating amont dans EventPage).
  const canSeeDetails = currentActor?.kind === 'entity'

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

/** Supprime l'avis de l'acteur sur cet event. RLS (`reviews_write_actor` = ALL,
 *  `can_act_as(actor_id)`) garantit qu'on ne peut effacer que le sien. */
export async function deleteReview(actorId: string, eventId: string) {
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('actor_id', actorId)
    .eq('event_id', eventId)
  return { error }
}
