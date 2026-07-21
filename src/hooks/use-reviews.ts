import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { Review, ReviewInsert } from '@/types/database'

/** Ligne d'avis renvoyée par la RPC `get_event_reviews` — identité déjà gatée
 *  côté DB (ami pro non-anonyme OU soi-même ; jamais un lecteur festival). */
export type ReviewWithActor = {
  id: string
  event_id: string
  affluence: number
  organisation: number
  rentabilite: number
  comment: string | null
  created_at: string
  anonymous: boolean
  is_self: boolean
  identity_visible: boolean
  author_label: string | null
  author_avatar_url: string | null
  author_slug: string | null
}

export function useEventReviews(eventId: string | undefined) {
  const { currentActor } = useAuth()
  const [reviews, setReviews] = useState<ReviewWithActor[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReviews = useCallback(async () => {
    if (!eventId) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows } = await (supabase.rpc as any)('get_event_reviews', {
      p_event_id: eventId, p_viewer_actor: currentActor?.id ?? null,
    })
    const list = ((rows as Array<Record<string, unknown>> | null) ?? []).map(r => ({
      id: r.review_id as string,
      event_id: r.event_id as string,
      affluence: r.affluence as number,
      organisation: r.organisation as number,
      rentabilite: r.rentabilite as number,
      comment: (r.comment as string | null) ?? null,
      created_at: r.created_at as string,
      anonymous: r.anonymous as boolean,
      is_self: r.is_self as boolean,
      identity_visible: r.identity_visible as boolean,
      author_label: (r.author_label as string | null) ?? null,
      author_avatar_url: (r.author_avatar_url as string | null) ?? null,
      author_slug: (r.author_slug as string | null) ?? null,
    }))
    setReviews(list)
    setLoading(false)
  }, [eventId, currentActor?.id])

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

/** Avis de l'acteur courant sur cet event — lecture directe (RLS `can_act_as`),
 *  utilisée pour préremplir/éditer/supprimer SON PROPRE avis. `anonymous` existe
 *  en base mais pas encore dans les types Supabase générés : on l'ajoute en local. */
type ReviewRow = Review & { anonymous: boolean }

export function useMyReview(eventId: string | undefined) {
  const { currentActor } = useAuth()
  const [review, setReview] = useState<ReviewRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!eventId || !currentActor) return
    supabase.from('reviews').select('*')
      .eq('event_id', eventId).eq('actor_id', currentActor.id).maybeSingle()
      .then(({ data }) => { setReview(data as ReviewRow | null); setLoading(false) })
  }, [eventId, currentActor])

  return { review, loading }
}

type ReviewSubmitInput = ReviewInsert & { anonymous?: boolean }

export async function submitReview(review: ReviewSubmitInput) {
  const { data, error } = await supabase
    .from('reviews')
    .upsert(review, { onConflict: 'actor_id,event_id' })
    .select().single()
  return { data, error }
}

/** Supprime l'avis de l'acteur sur cet event. RLS (`reviews_delete_own`) garantit
 *  qu'on ne peut effacer que le sien (ou en admin). */
export async function deleteReview(actorId: string, eventId: string) {
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('actor_id', actorId)
    .eq('event_id', eventId)
  return { error }
}
