/**
 * QUOI     — l'avis de l'acteur actif sur une date : le lire pour le reprendre, l'enregistrer.
 * POURQUOI — « Écrire un avis » sert aussi à le modifier ; un exposant ne laisse qu'un avis par
 *            date (index unique actor_id, event_id).
 * ATTENTION — la base n'accepte un avis que d'un exposant INSCRIT à la date (policy
 *            reviews_insert_verified) ; l'écran n'y mène que dans ce cas.
 */
import { useCallback, useEffect, useState } from 'react'
import { must, supabase } from '@/lib/supabase'

export interface ReviewDraft {
  affluence: number
  organisation: number
  rentabilite: number
  comment: string
  /** Personne ne voit mon nom, pas même mes amis. */
  anonymous: boolean
}

export const EMPTY_REVIEW: ReviewDraft = {
  affluence: 0,
  organisation: 0,
  rentabilite: 0,
  comment: '',
  anonymous: false,
}

async function loadMyReview(eventId: string, actorId: string): Promise<ReviewDraft | null> {
  const response = await supabase
    .from('reviews')
    .select('affluence, organisation, rentabilite, comment, anonymous')
    .eq('actor_id', actorId)
    .eq('event_id', eventId)
    .maybeSingle()
  const row = must(response)
  if (!row) return null
  return { ...row, comment: row.comment ?? '' }
}

export function useMyReview(
  eventId: string | undefined,
  actorId: string | null | undefined,
  personActorId: string | null | undefined,
) {
  const [existing, setExisting] = useState<ReviewDraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId || !actorId) return
    let cancelled = false

    async function run(currentEvent: string, currentActor: string) {
      let next: ReviewDraft | null = null
      let failure: string | null = null
      try {
        next = await loadMyReview(currentEvent, currentActor)
      } catch {
        failure = 'Ton avis n’a pas pu être chargé.'
      }
      if (cancelled) return
      setExisting(next)
      setError(failure)
      setLoading(false)
    }

    void run(eventId, actorId)
    return () => {
      cancelled = true
    }
  }, [eventId, actorId])

  /** Publie (ou remplace) l'avis. Rend vrai si la base l'a pris. */
  const publish = useCallback(
    async (draft: ReviewDraft): Promise<boolean> => {
      if (!eventId || !actorId) return false
      setError(null)
      const response = await supabase.from('reviews').upsert(
        {
          actor_id: actorId,
          event_id: eventId,
          acted_by_user_id: personActorId ?? null,
          affluence: draft.affluence,
          organisation: draft.organisation,
          rentabilite: draft.rentabilite,
          comment: draft.comment.trim() || null,
          anonymous: draft.anonymous,
        },
        { onConflict: 'actor_id,event_id' },
      )
      if (response.error) {
        setError('Ton avis n’a pas pu être publié.')
        return false
      }
      return true
    },
    [eventId, actorId, personActorId],
  )

  return { existing, loading, error, publish }
}
